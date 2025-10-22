import http from "http";
// Use fs.promises for async file operations
import { promises as fs } from "fs";
import path from "path";
import { parse, URLSearchParams, fileURLToPath } from "url";
import { hashString } from "./hashing-engine.js";

// --- Constants ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stringsFilePath = path.join(__dirname, "strings.json");

// --- String Data Bank ---
let stringsBank = [];
// Load the database on startup
try {
	const data = await fs.readFile(stringsFilePath, "utf-8");
	stringsBank = JSON.parse(data);
	console.log("String database loaded successfully.");
} catch (error) {
	if (error.code === "ENOENT") {
		console.log("No database file found, starting with an empty one.");
	} else {
		console.error("Failed to load string database:", error);
	}
}

// --- Middleware ---
const convertStream = (req, res, next) => {
	// FIX: Initialize req.body to prevent errors on GET requests
	req.body = {};

	// FIX: Skip body parsing for methods that don't have a body
	if (req.method !== "POST") {
		return next();
	}

	let body = "";
	const contentType = req.headers["content-type"];

	req.on("data", (data) => {
		body += data.toString();
	});

	req.on("end", () => {
		try {
			// FIX: Handle empty bodies to prevent JSON.parse("") crash
			if (body.length === 0) {
				return next();
			}

			if (contentType === "application/json") {
				req.body = JSON.parse(body);
			} else if (contentType === "application/x-www-form-urlencoded") {
				const chunkCompile = new URLSearchParams(body);
				req.body = Object.fromEntries(chunkCompile.entries());
			}
		} catch (e) {
			res.writeHead(400, { "content-type": "application/json" });
			res.end(
				JSON.stringify({ status: "error", message: "Invalid JSON format" })
			);
			return;
		}
		next();
	});
};

// Creating the middleware stack
const middlewareStack = [convertStream];

async function finalHandler(req, res) {
	try {
		const { value } = req.body;

		// FIX: Added return statements to all validation blocks
		if (value === undefined) {
			res.writeHead(400, { "content-type": "application/json" });
			res.end(
				JSON.stringify({
					status: "error",
					message: "Invalid request body or missing 'value' field",
				})
			);
			return;
		}
		if (typeof value !== "string") {
			res.writeHead(422, { "content-type": "application/json" });
			res.end(
				JSON.stringify({
					status: "error",
					message: "Invalid data type for 'value' (must be string)",
				})
			);
			return;
		}
		if (stringsBank.some((el) => el?.value === value)) {
			res.writeHead(409, { "content-type": "application/json" });
			res.end(
				JSON.stringify({
					status: "error",
					message: "String already exists in the system",
				})
			);
			return;
		}

		const charCounts = new Map();
		for (const char of value.replaceAll(" ", "")) {
			const count = charCounts.get(char) || 0;
			charCounts.set(char, count + 1);
		}
		const characterMap = Object.fromEntries(charCounts);

		let is_palindrome = false;
		if (value.length > 0 && value.split("").reverse().join("") === value) {
			is_palindrome = true;
		}

		const hashedString = await hashString(value);
		const uniqueCharactersCount = new Set(value).size;
		const wordCount =
			value.trim() === "" ? 0 : value.trim().split(/\s+/).length;

		const responseObject = {
			id: hashedString,
			value: value,
			properties: {
				length: value.length,
				is_palindrome,
				unique_characters: uniqueCharactersCount,
				word_count: wordCount,
				sha256_hash: hashedString,
				character_frequency_map: characterMap,
			},
			created_at: new Date().toISOString(),
		};

		stringsBank.push(responseObject);
		await fs.writeFile(stringsFilePath, JSON.stringify(stringsBank, null, 2));

		res.writeHead(201, { "content-type": "application/json" });
		res.end(JSON.stringify({ status: "success", data: responseObject }));
	} catch (error) {
		console.log(error);
		res.writeHead(500, { "content-type": "application/json" });
		res.end(
			JSON.stringify({ status: "error", message: "Internal server error" })
		);
	}
}

async function getStringHandler(req, res, stringValue) {
	const decodedValue = decodeURIComponent(stringValue);
	const foundStringData = stringsBank.find((el) => el.value === decodedValue);

	if (foundStringData) {
		res.writeHead(200, { "content-type": "application/json" });
		res.end(JSON.stringify({ status: "success", data: foundStringData }));
	} else {
		res.writeHead(404, { "content-type": "application/json" });
		res.end(
			JSON.stringify({
				status: "error",
				message: "String does not exist in the system",
			})
		);
	}
}

function getAllStringsHandler(req, res, query) {
	let results = [...stringsBank];
	const filters_applied = {};
	const errors = [];

	// Apply filters
	try {
		if (query.is_palindrome !== undefined) {
			const isPalindrome = query.is_palindrome === "true";
			results = results.filter(
				(s) => s.properties.is_palindrome === isPalindrome
			);
			filters_applied.is_palindrome = isPalindrome;
		}
		if (query.min_length !== undefined) {
			const min = parseInt(query.min_length);
			if (isNaN(min)) throw new Error("Invalid min_length");
			results = results.filter((s) => s.properties.length >= min);
			filters_applied.min_length = min;
		}
		if (query.max_length !== undefined) {
			const max = parseInt(query.max_length);
			if (isNaN(max)) throw new Error("Invalid max_length");
			results = results.filter((s) => s.properties.length <= max);
			filters_applied.max_length = max;
		}
		if (query.word_count !== undefined) {
			const count = parseInt(query.word_count);
			if (isNaN(count)) throw new Error("Invalid word_count");
			results = results.filter((s) => s.properties.word_count === count);
			filters_applied.word_count = count;
		}
		if (query.contains_character !== undefined) {
			results = results.filter((s) =>
				s.value.includes(query.contains_character)
			);
			filters_applied.contains_character = query.contains_character;
		}
	} catch (error) {
		res.writeHead(400, { "content-type": "application/json" });
		res.end(
			JSON.stringify({
				status: "error",
				message: "Invalid query parameter values or types",
			})
		);
		return;
	}

	res.writeHead(200, { "content-type": "application/json" });
	res.end(
		JSON.stringify({
			data: results,
			count: results.length,
			filters_applied,
		})
	);
}

function naturalLanguageHandler(req, res, query) {
	const originalQuery = query.query || "";
	if (!originalQuery) {
		res.writeHead(400, { "content-type": "application/json" });
		res.end(
			JSON.stringify({ status: "error", message: "Missing 'query' parameter" })
		);
		return;
	}

	let results = [...stringsBank];
	const parsed_filters = {};

	// Simple heuristic parsing based on keywords
	if (originalQuery.includes("palindromic")) {
		parsed_filters.is_palindrome = true;
		results = results.filter((s) => s.properties.is_palindrome === true);
	}
	if (originalQuery.includes("single word")) {
		parsed_filters.word_count = 1;
		results = results.filter((s) => s.properties.word_count === 1);
	}
	const longerThanMatch = originalQuery.match(/longer than (\d+)/);
	if (longerThanMatch) {
		const min = parseInt(longerThanMatch[1]) + 1;
		parsed_filters.min_length = min;
		results = results.filter((s) => s.properties.length >= min);
	}
	const containsMatch = originalQuery.match(/containing the letter (\w)/i);
	if (containsMatch) {
		const char = containsMatch[1];
		parsed_filters.contains_character = char;
		results = results.filter((s) => s.value.includes(char));
	}
	const firstVowelMatch = originalQuery.match(/first vowel/i);
	if (firstVowelMatch) {
		parsed_filters.contains_character = "a";
		results = results.filter((s) => s.value.includes("a"));
	}

	res.writeHead(200, { "content-type": "application/json" });
	res.end(
		JSON.stringify({
			data: results,
			count: results.length,
			interpreted_query: {
				original: originalQuery,
				parsed_filters,
			},
		})
	);
}

async function deleteStringHandler(req, res, stringValue) {
	try {
		const decodedValue = decodeURIComponent(stringValue);
		const index = stringsBank.findIndex((el) => el.value === decodedValue);

		if (index === -1) {
			res.writeHead(404, { "content-type": "application/json" });
			res.end(
				JSON.stringify({
					status: "error",
					message: "String does not exist in the system",
				})
			);
			return;
		}

		stringsBank.splice(index, 1);
		await fs.writeFile(stringsFilePath, JSON.stringify(stringsBank, null, 2));

		res.writeHead(204, { "content-type": "application/json" });
		res.end();
	} catch (error) {
		console.log(error);
		res.writeHead(500, { "content-type": "application/json" });
		res.end(
			JSON.stringify({ status: "error", message: "Internal server error" })
		);
	}
}

// --- Server ---
const server = http.createServer((req, res) => {
	let currentMiddlewareIndex = 0;
	const { pathname, query } = parse(req.url, true);
	const urlParts = pathname.split("/"); // e.g., /strings/hello -> ['', 'strings', 'hello']

	function next() {
		if (currentMiddlewareIndex < middlewareStack.length) {
			const stack = middlewareStack[currentMiddlewareIndex];
			// FIX: Increment index *before* calling to prevent infinite loops
			currentMiddlewareIndex++;
			stack(req, res, next);
		}
		// --- ROUTER LOGIC ---
		// FIX: Re-structured all routes as a sequential if/else if chain
		else if (pathname === "/strings" && req.method === "POST") {
			finalHandler(req, res);
		} else if (pathname === "/strings" && req.method === "GET") {
			getAllStringsHandler(req, res, query);
		} else if (
			pathname === "/strings/filter-by-natural-language" &&
			req.method === "GET"
		) {
			naturalLanguageHandler(req, res, query);
		} else if (
			urlParts[1] === "strings" &&
			urlParts.length === 3 &&
			req.method === "GET"
		) {
			const stringParam = urlParts[2];
			getStringHandler(req, res, stringParam);
		} else if (
			urlParts[1] === "strings" &&
			urlParts.length === 3 &&
			req.method === "DELETE"
		) {
			const stringParam = urlParts[2];
			deleteStringHandler(req, res, stringParam);
		}
		// Fallback 404 Not Found
		else {
			res.writeHead(404, { "content-type": "application/json" });
			res.end(JSON.stringify({ status: "error", message: "Route not found" }));
		}
	}
	next();
});

server.listen(3000, () => {
	console.log("Server listening on port 3000");
});
