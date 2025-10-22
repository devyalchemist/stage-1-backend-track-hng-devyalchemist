# HNG Backend Track 0: String Analysis API

![HNG Internship](https://img.shields.io/badge/HNG%20Internship-Backend%20Track%200-blue)
![Node.js](https://img.shields.io/badge/Node.js-Native-green)
![ES Modules](https://img.shields.io/badge/Modules-ESM-yellow)

A lightweight, high-performance String Analysis API built entirely with native Node.js modules. This project was created as a solution for the HNG Internship (Backend Track 0) task.

The API allows users to submit strings, stores them in a local JSON database, and provides a powerful set of tools for analyzing and filtering the stored strings based on various properties.

---

## Features

* **No Frameworks:** Built 100% on native Node.js modules (`http`, `fs`, `url`, `crypto`).
* **Asynchronous:** Uses `async/await` and `fs.promises` to be non-blocking.
* **Full CRUD:** Create, Retrieve, Filter, and Delete strings.
* **Rich Analysis:** Automatically calculates 10+ properties for every string (length, word count, palindrome check, character frequency, etc.).
* **Advanced Filtering:** Filter all strings by any combination of properties (e.g., `is_palindrome=true&min_length=5`).
* **Natural Language Queries:** A simple, heuristic-based endpoint to filter using plain English (e.g., `"all single word palindromic strings"`).
* **Persistent Storage:** Uses a local `strings.json` file as a simple database.

---

## API Endpoints

### 1. Create a New String

Adds a new string to the database and returns its full analysis.

* **Endpoint:** `POST /strings`
* **Body (`application/json` or `x-www-form-urlencoded`):**
    ```json
    {
      "value": "A new test string"
    }
    ```
* **Success Response (201 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "id": "hash-of-the-string",
        "value": "A new test string",
        "properties": {
          "length": 17,
          "is_palindrome": false,
          "unique_characters": 11,
          "word_count": 4,
          "sha256_hash": "hash-of-the-string",
          "character_frequency_map": { "A": 1, " ": 3, "n": 1, ... }
        },
        "created_at": "2025-10-22T08:00:00Z"
      }
    }
    ```
* **Error Responses:**
    * `400 Bad Request`: Missing or invalid 'value' field.
    * `409 Conflict`: The string already exists in the database.

---

### 2. Get a Specific String

Retrieves a single string and its properties by its exact value.

* **Endpoint:** `GET /strings/{string_value}`
* **Example:** `GET /strings/hello%20world`
* **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "id": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
        "value": "hello world",
        "properties": { ... },
        "created_at": "2025-10-22T08:05:00Z"
      }
    }
    ```
* **Error Responses:**
    * `404 Not Found`: String does not exist.

---

### 3. Get All Strings (with Filtering)

Retrieves all strings, with powerful query parameters for filtering.

* **Endpoint:** `GET /strings`
* **Query Parameters (Optional):**
    * `is_palindrome`: `true` or `false`
    * `min_length`: integer
    * `max_length`: integer
    * `word_count`: integer
    * `contains_character`: string
* **Example:** `GET /strings?is_palindrome=true&min_length=3`
* **Success Response (200 OK):**
    ```json
    {
      "data": [
        { "id": "...", "value": "racecar", ... },
        { "id": "...", "value": "madam", ... }
      ],
      "count": 2,
      "filters_applied": {
        "is_palindrome": true,
        "min_length": 3
      }
    }
    ```
* **Error Responses:**
    * `400 Bad Request`: Invalid query parameter types (e.g., `min_length=abc`).

---

### 4. Natural Language Filtering

Filters strings based on a simple, human-readable query.

* **Endpoint:** `GET /strings/filter-by-natural-language`
* **Query Parameter:**
    * `query`: The natural language string.
* **Example:** `GET /strings/filter-by-natural-language?query=all%20single%20word%20palindromic%20strings`
* **Success Response (200 OK):**
    ```json
    {
      "data": [
        { "id": "...", "value": "level", ... }
      ],
      "count": 1,
      "interpreted_query": {
        "original": "all single word palindromic strings",
        "parsed_filters": {
          "is_palindrome": true,
          "word_count": 1
        }
      }
    }
    ```
* **Error Responses:**
    * `400 Bad Request`: Missing 'query' parameter.

---

### 5. Delete a String

Deletes a string from the database by its exact value.

* **Endpoint:** `DELETE /strings/{string_value}`
* **Example:** `DELETE /strings/hello%20world`
* **Success Response (204 No Content):**
    * (No response body)
* **Error Responses:**
    * `404 Not Found`: String does not exist.

---

## Tech Stack

* **Core:** [Node.js](https://nodejs.org/) (v22+)
* **Modules:** Native `http`, `fs/promises`, `path`, `url`, `crypto`
* **Language:** JavaScript (ES Modules)
* **Database:** `strings.json` (JSON file)

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
    cd your-repo-name
    ```
2.  **Initialize the Database:**
    Create an empty JSON file named `strings.json` in the root of the project:
    ```bash
    echo "[]" > strings.json
    ```
3.  **Install Dependencies:**
    This project has **zero external dependencies**. No `npm install` is needed.
4.  **Run the server:**
    ```bash
    node index.js
    ```
    The server will start on `http://localhost:3000`.

## Author

* **Gospel Ugwuja**
* **Email:** devyalchemist@gmail.com

## License

This project is licensed under the MIT License.
