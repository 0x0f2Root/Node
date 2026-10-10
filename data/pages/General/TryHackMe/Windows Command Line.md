---
tags:
  - "Windows"
---

```javascript title="Determine the operating system (OS) version"
ver
```

```
set
```

```
systeminfo
```

# Windows Network Configuration & Troubleshooting

> Quick reference for Windows networking, troubleshooting, and basic network enumeration. Useful for IT, cybersecurity labs, and TryHackMe.

## 1. Network Configuration — `ipconfig`

Display basic network configuration:

```javascript
ipconfig
```

Shows:

- IPv4 and IPv6 addresses
- Subnet mask
- Default gateway

Display detailed network information:

```javascript
ipconfig /all
```

Additional information includes:

- Network adapter description
- Physical (MAC) address
- DHCP status and server
- DNS servers
- DHCP lease information
- DNS suffix

### Important fields

| Field            | Purpose                                                   |
| ---------------- | --------------------------------------------------------- |
| IPv4 Address     | Device's IPv4 address                                     |
| Subnet Mask      | Defines the local IPv4 network boundary                   |
| Default Gateway  | Router used to reach other networks                       |
| Physical Address | Network adapter's MAC address                             |
| DHCP Enabled     | Indicates whether configuration is assigned automatically |
| DHCP Server      | Server providing DHCP configuration                       |
| DNS Servers      | Servers used to resolve domain names into IP addresses    |

---

## 2. Test Connectivity — `ping`

Test whether a host responds to ICMP Echo Requests:

```javascript
ping example.com
```

Ping an IP address directly:

```
ping 192.168.1.1
```

Send a specific number of requests:

```
ping -n 4 example.com
```

### Interpret the output

| Field        | Meaning                            |
| ------------ | ---------------------------------- |
| `Reply from` | A response was received            |
| `time=78ms`  | Round-trip response time           |
| `TTL`        | Remaining IP packet lifetime       |
| `Sent`       | Number of requests sent            |
| `Received`   | Number of replies received         |
| `Lost`       | Number of requests without replies |

**Important:** A failed ping does not necessarily mean a host is offline. Firewalls may block ICMP traffic.

---

## 3. Trace the Network Route — `tracert`

Display the network hops between your computer and a destination:

```
tracert example.com
```

Limit the maximum number of hops:

```
tracert -h 20 example.com
```

Disable hostname resolution to display IP addresses only:

```
tracert -d example.com
```

### How it works

- Sends packets with progressively increasing TTL values.
- Routers may respond when a packet's TTL expires.
- Displays each responding hop and its response times.
- Continues until the destination is reached or the hop limit is exhausted.

**Troubleshooting tip:** `* * * Request timed out` means no response was received within the timeout. Routers may filter or deprioritize these probes, so a timeout does not automatically indicate a broken route.

---

## 4. DNS Lookup — `nslookup`

Resolve a domain using the default DNS server:

```
nslookup example.com
```

Query a specific DNS server, such as Cloudflare:

```
nslookup example.com 1.1.1.1
```

Query Google's public DNS server:

```
nslookup example.com 8.8.8.8
```

Look up a specific record type:

```
nslookup -type=A example.com
nslookup -type=AAAA example.com
nslookup -type=MX example.com
nslookup -type=NS example.com
nslookup -type=TXT example.com
```

### Common DNS record types

| Record | Purpose                                                          |
| ------ | ---------------------------------------------------------------- |
| `A`    | Maps a hostname to an IPv4 address                               |
| `AAAA` | Maps a hostname to an IPv6 address                               |
| `MX`   | Identifies mail servers                                          |
| `NS`   | Identifies authoritative name servers                            |
| `TXT`  | Stores text data, often used for verification and email security |

**Troubleshooting tip:** If a domain resolves with one DNS server but not another, investigate DNS configuration, caching, filtering, or propagation.

---

## 5. Network Connections and Ports — `netstat`

Display current network connections:

```
netstat
```

Display all connections and listening ports:

```
netstat -a
```

Display numerical IP addresses and port numbers:

```
netstat -n
```

Show the process ID (PID) associated with each connection:

```
netstat -o
```

Show the executable associated with connections (typically requires an elevated terminal):

```
netstat -b
```

Combine the options:

```
netstat -abon
```

### Option reference

| Option | Description                                                                                                          |
| ------ | -------------------------------------------------------------------------------------------------------------------- |
| `-a`   | Displays active connections and listening ports                                                                      |
| `-b`   | Displays the executable involved in creating each connection or listening port; may require administrator privileges |
| `-o`   | Displays the owning process ID (PID)                                                                                 |
| `-n`   | Displays numerical addresses and port numbers without resolving names                                                |

### Connection states

| State         | Meaning                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------- |
| `LISTENING`   | Waiting for incoming connections                                                             |
| `ESTABLISHED` | Connection is established                                                                    |
| `TIME_WAIT`   | Connection is waiting before final closure                                                   |
| `CLOSE_WAIT`  | Remote endpoint has closed the connection; the local application has not fully closed it yet |

### Example: Identify an SSH service

```
TCP    0.0.0.0:22    0.0.0.0:0    LISTENING    2116
[sshd.exe]
```

Interpretation:

- `TCP`: Protocol.
- `0.0.0.0:22`: Listening on port 22 on all local IPv4 interfaces.
- `LISTENING`: Waiting for incoming connections.
- `2116`: Process ID.
- `sshd.exe`: Executable associated with the listener.

To investigate a PID further:

```
tasklist /FI "PID eq 2116"
```

---

## 6. Quick Troubleshooting Workflow

When a host or website cannot be reached, work through these checks:

### Step 1 — Check local configuration

```
ipconfig /all
```

Verify the IP address, subnet mask, gateway, DHCP, and DNS servers.

### Step 2 — Test the local TCP/IP stack

```
ping 127.0.0.1
```

This tests the IPv4 loopback interface.

### Step 3 — Test the default gateway

```
ping 10.10.0.1
```

Replace the address with the gateway shown by `ipconfig`.

### Step 4 — Test external connectivity by IP

```
ping 1.1.1.1
```

A reply suggests IP connectivity to that destination, although ICMP filtering can affect the result.

### Step 5 — Test DNS resolution

```
nslookup example.com
```

If IP connectivity works but DNS resolution fails, investigate DNS settings.

### Step 6 — Inspect the network route

```
tracert example.com
```

Look for where responses stop, remembering that intermediate routers may not reply.

### Step 7 — Inspect connections and listening ports

```
netstat -abon
```

Identify listening services, active connections, associated executables, and process IDs.

---

## 7. Command Summary

| Command                      | Main purpose                                                    |
| ---------------------------- | --------------------------------------------------------------- |
| `ipconfig`                   | Display basic network configuration                             |
| `ipconfig /all`              | Display detailed network configuration                          |
| `ping HOST`                  | Test ICMP connectivity                                          |
| `ping -n 4 HOST`             | Send four ping requests                                         |
| `tracert HOST`               | Trace the network route                                         |
| `tracert -d HOST`            | Trace the route without resolving hostnames                     |
| `nslookup DOMAIN`            | Query DNS                                                       |
| `nslookup DOMAIN 1.1.1.1`    | Query a specified DNS server                                    |
| `netstat`                    | Display active connections                                      |
| `netstat -a`                 | Display connections and listening ports                         |
| `netstat -abon`              | Display connections, executables, PIDs, and numerical addresses |
| `tasklist /FI "PID eq 2116"` | Find a process by PID                                           |

## Key Takeaways

- Use `ipconfig /all` to understand a machine's network configuration.
- Use `ping` to test connectivity, but remember that ICMP can be blocked.
- Use `tracert` to investigate routing and intermediate hops.
- Use `nslookup` to troubleshoot DNS resolution.
- Use `netstat -abon` to investigate listening ports, active connections, executables, and PIDs.
- Combine these tools to narrow down whether a problem involves local configuration, routing, connectivity, DNS, or a specific service.
