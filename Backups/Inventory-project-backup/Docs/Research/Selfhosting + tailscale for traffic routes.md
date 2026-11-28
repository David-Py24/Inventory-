Combining a self-hosted **Dell Inspiron 3000** server with **Tailscale** gives you the best of both worlds: zero public port exposure, end-to-end WireGuard encryption, and seamless remote access for the client's Authorized Device without putting their database on a public cloud.

When the Store Device and Dell server are on the same local network, Tailscale automatically establishes a direct peer-to-peer LAN route (`100.x.y.z` MagicDNS) with near-zero latency; when the client leaves the store with their Authorized Device, Tailscale transparently punches through NAT over WireGuard so PowerSync keeps streaming store updates anywhere.

---

### How the Traffic Routes Over Tailscale

| Node | Role | Network Interface & Endpoint | How It Connects |
| --- | --- | --- | --- |
| **Dell Inspiron 3000** | Central Server (Postgres + PowerSync) | Tailscale IP (`100.x.y.z`) + MagicDNS (`store-hub`) | Runs `tailscaled` on Ubuntu Server; UFW firewall blocks all public/LAN ingress except `tailscale0`. |
| **Store Device** | Write/Update Terminal | Local SQLite → `http://store-hub:8080` | Connects directly over local Wi-Fi/LAN via Tailscale peer routing; queues offline writes if internet drops. |
| **Authorized Device** | Read-Only Viewer (Phone/Laptop) | Local SQLite ← `http://store-hub:8080` | Connects via Tailscale VPN from home or mobile data; receives live PowerSync deltas over WireGuard. |

---

### Step-by-Step: Locking Down the Dell Server with Tailscale

Because this involves system services and firewall rules, configure the Dell Inspiron 3000 in this exact order:

1. **Install Tailscale & Enable MagicDNS on Ubuntu Server**
* SSH into your Dell Inspiron 3000 and install Tailscale via the official script (`curl -fsSL [https://tailscale.com/install.sh](https://tailscale.com/install.sh) | sh`), then authenticate with `sudo tailscale up`.
* In your Tailscale Admin Console (**Machines** tab), click the three-dot menu next to the Dell server and select **Disable key expiry** so the server never drops off the network after 180 days.
* Rename the machine to a clean hostname (e.g., `store-hub`) so both devices can connect to `http://store-hub:8080` regardless of IP changes.
* *Verification:* Run `tailscale status` on the Dell laptop and confirm it shows `active` with an assigned `100.x.y.z` IPv4 address.


2. **Restrict Firewall Access Strictly to `tailscale0**`
* Lock down Ubuntu's firewall (UFW) so neither PowerSync (`8080`), PostgreSQL (`5432`), nor SSH (`22`) accepts connections from outside your Tailscale mesh:
* `sudo ufw default deny incoming`
* `sudo ufw allow in on tailscale0`
* `sudo ufw enable`


* *Verification:* Run `sudo ufw status verbose` and verify only `Anywhere on tailscale0` is permitted for incoming traffic.


3. **Configure Tailscale ACLs to Isolate Store vs. Authorized Devices**
* Tag the Dell server as `tag:server`, the Store Device as `tag:store-pos`, and the client's remote device as `tag:client-viewer`.
* In the Tailscale Admin Console **Access Controls** policy, restrict both devices so they can only reach port `8080` (PowerSync) on `tag:server`—blocking them from hitting PostgreSQL port `5432` or SSH port `22` directly.
* *Verification:* From the Authorized Device, run `nc -zv store-hub 8080` (succeeds) and `nc -zv store-hub 5432` (times out/refused).


4. **Point Both Apps to `http://store-hub:8080` (HTTP Inside WireGuard)**
* Because Tailscale already wraps all traffic between nodes in mutual WireGuard encryption, your PowerSync client connector can safely point to `http://store-hub:8080` without needing public SSL certificates or a domain name.
* *Verification:* Turn off Wi-Fi on the client's phone (switch to mobile data), enable the Tailscale app, open the viewer app, and confirm a test sale logged on the Store Device appears within seconds.



---

### One Edge Case to Watch: Store Internet Outages

* **Inside the Store (LAN Outage vs. ISP Outage):** If the store's ISP internet goes down, the Store Device continues logging sales to its local SQLite database. Once ISP internet returns, `tailscaled` on the Dell Inspiron automatically reconnects to Tailscale's coordination servers and syncs the backlog to the client's remote device.
* **Keep a Physical Off-Site Recovery Copy:** Because the Dell server lives inside the store, schedule a weekly encrypted backup script (`pg_dump` piped through `gpg` or `age`) onto a USB drive or an encrypted cloud bucket so you still have a recovery copy if the laptop is stolen or damaged.