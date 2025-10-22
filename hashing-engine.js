import crypto from "crypto";

export function hashString(string) {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash("sha256");
		hash.on("readable", () => {
			// Only one element is going to be produced by the
			// hash stream.
			const data = hash.read();
			if (data) {
				console.log(data.toString("hex"));
				resolve(data.toString("hex"));
				// Prints:
				//   6a2da20943931e9834fc12cfe5bb47bbd9ae43489a30726962b576f4e3993e50
			}
		});
		hash.on("error", (err) => {
			reject(err);
		});
		hash.write(string);
		hash.end();
	});
}
