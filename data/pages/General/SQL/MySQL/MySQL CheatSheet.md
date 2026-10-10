---
tags:
  - "MySQL"
---

### MySQL / MariaDB Pentesting Cheatsheet

### Connect

```bash
mysql -u root -p
mysql -u USER -p -h TARGET
mysql -u USER -p -h TARGET -P 3306
````

```bash
mysql -h TARGET -u USER -p
```

---

## Basic Enumeration

### Version

```sql
SELECT VERSION();
```

### Current user

```sql
SELECT USER();
```

### Current database

```sql
SELECT DATABASE();
```

### Hostname

```sql
SELECT @@hostname;
```

### OS / Platform

```sql
SELECT @@version_compile_os;
```

### MySQL data directory

```sql
SELECT @@datadir;
```

---

## Databases

### List databases

```sql
SHOW DATABASES;
```

### Select database

```sql
USE database_name;
```

### Confirm current database

```sql
SELECT DATABASE();
```

---

## Tables

### List tables

```sql
SHOW TABLES;
```

### List tables from a database

```sql
SHOW TABLES FROM database_name;
```

### Inspect table

```sql
DESCRIBE table_name;
```

```sql
DESC table_name;
```

### Show table definition

```sql
SHOW CREATE TABLE table_name;
```

---

## Columns

### List all columns

```sql
SELECT TABLE_NAME, COLUMN_NAME
FROM information_schema.columns
WHERE table_schema = DATABASE();
```

### Find interesting columns

```sql
SELECT TABLE_NAME, COLUMN_NAME
FROM information_schema.columns
WHERE table_schema = DATABASE()
AND COLUMN_NAME REGEXP
'flag|user|username|pass|password|token|secret|key';
```

---

## Information Schema

### Databases

```sql
SELECT schema_name
FROM information_schema.schemata;
```

### Tables

```sql
SELECT table_schema, table_name
FROM information_schema.tables;
```

### Tables in current DB

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE();
```

### Columns

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = DATABASE();
```

---

## Read Data

```sql
SELECT * FROM table_name;
```

Limit output:

```sql
SELECT * FROM table_name LIMIT 10;
```

Specific columns:

```sql
SELECT username, password
FROM table_name;
```

Search:

```sql
SELECT *
FROM table_name
WHERE username LIKE '%admin%';
```

---

## Users & Privileges

### MySQL users

```sql
SELECT User, Host
FROM mysql.user;
```

### Current privileges

```sql
SHOW GRANTS;
```

### Privileges for a user

```sql
SHOW GRANTS FOR 'user'@'localhost';
```

---

## Interesting Targets

### Find tables containing interesting names

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name REGEXP
'flag|user|admin|account|password|secret|token';
```

### Find interesting columns

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name REGEXP
'flag|user|username|pass|password|secret|token|key';
```

---

## Quick Pentest Workflow

```sql
SELECT VERSION();

SELECT USER();

SELECT CURRENT_USER();

SELECT DATABASE();

SHOW DATABASES;

USE <database>;

SHOW TABLES;

DESC <table>;

SELECT * FROM <table>;
```

Then:

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = DATABASE();
```

Look for:

```text
users
admin
password
passwd
credentials
token
secret
api_key
flag
```

---

## Exit

```sql
EXIT;
```

or:

```sql
QUIT;
```

---

## Default Port

```text
3306/tcp
```

Check with:

```bash
nmap -p 3306 TARGET
```

Service detection:

```bash
nmap -sV -p 3306 TARGET
```

---

# TL;DR

```bash
mysql -u USER -p -h TARGET
```

```sql
SELECT VERSION();
SELECT USER();
SELECT DATABASE();

SHOW DATABASES;
USE DB;
SHOW TABLES;
DESC TABLE;

SELECT * FROM TABLE;

SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = DATABASE();

SELECT User, Host FROM mysql.user;
SHOW GRANTS;
```
