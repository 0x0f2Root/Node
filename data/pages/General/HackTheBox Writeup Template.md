![Hack The Box Banner](https://miro.medium.com/v2/1*1QHEH7I1AYh8NTJKnWVM8Q.png)

# Hack The Box — Machine Writeup

> Technical walkthrough documenting the reconnaissance, enumeration, exploitation, and privilege escalation process of the target machine.

---

## Machine Information

| Property         | Value                           |
| ---------------- | ------------------------------- |
| Machine          | `Meow`                          |
| IP Address       | `10.10.10.X`                    |
| Operating System | `Linux / Windows`               |
| Difficulty       | `Easy / Medium / Hard / Insane` |
| Release Date     | `YYYY-MM-DD`                    |
| Author           | `Author`                        |

### Scope

```text
Target: 10.10.10.X
Hostname: target.htb
```

### Objectives

* Obtain initial access
* Obtain user access
* Escalate privileges
* Obtain root or SYSTEM access

---

# 1. Reconnaissance

## 1.1 Host Discovery

```bash
ping -c 4 10.10.10.X
```

## 1.2 Initial Port Scan

```bash
nmap -Pn -n -T4 10.10.10.X
```

## 1.3 Full Port Scan

```bash
nmap -Pn -n -p- --min-rate 5000 10.10.10.X
```

### 1.4 Service Enumeration

```bash
nmap -Pn -n -sC -sV -p <PORTS> 10.10.10.X
```

## Open Ports

|  Port | Service | Version       | Notes |
| ----: | ------- | ------------- | ----- |
|  `22` | SSH     | `OpenSSH X.X` |       |
|  `80` | HTTP    | `Apache X.X`  |       |
| `445` | SMB     |               |       |

---

# 2. Enumeration

## 2.1 DNS Enumeration

```bash
```

### Findings

```text
```

---

## 2.2 Web Enumeration

### Target

```text
http://10.10.10.X
```

### Technologies

| Technology | Version | Notes |
| ---------- | ------- | ----- |
| Web Server |         |       |
| Language   |         |       |
| Framework  |         |       |
| CMS        |         |       |

### Directory Enumeration

```bash
ffuf -u http://10.10.10.X/FUZZ \
-w /path/to/wordlist.txt \
-fc 404
```

### Interesting Endpoints

```text
/admin
/login
/uploads
/api
```

---

## 2.3 Virtual Host Enumeration

```bash
ffuf -u http://10.10.10.X/ \
-H "Host: FUZZ.target.htb" \
-w /path/to/wordlist.txt \
-fc 404
```

### Discovered Hosts

```text
target.htb
dev.target.htb
```

---

## 2.4 SMB Enumeration

```bash
smbclient -L //10.10.10.X/ -N
```

```bash
nmap -Pn -p445 --script smb-enum-shares,smb-enum-users 10.10.10.X
```

### Findings

```

