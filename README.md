# Currency Rate Checker

A web app that shows live exchange rates for about 160 currencies. Pick a base currency, enter an amount, and instantly see how much of every other currency you get. You can search for a currency (e.g. `RWF`) and sort by rate. It is useful for travelers, students, freelancers and anyone who needs a quick conversion.

## Links

- **Demo video (max 2 min):** PASTE_YOUR_VIDEO_LINK_HERE
- **Deployed app (through the load balancer):** https://localhost:4443 (runs in the ALU web infrastructure lab on Docker, so it is reachable from the machine running the lab; see the demo video for the live proof)
- **Web01:** http://localhost:8080
- **Web02:** http://localhost:8081
- **GitHub repo:** https://github.com/nagasaro1-afk/currency-rate-checker

## Credentials

- **API key:** none required. The API used is a free open endpoint.
- **Login:** none required. The app has no authentication.

## Features

- Live exchange rates fetched from an external API
- Choose any base currency from a dropdown
- Enter an amount and see the converted value for every currency
- Search/filter currencies by code
- Sort by rate (high to low or low to high)
- Clear error message if the API is down or returns an invalid response
- Responsive layout that works on phones and desktops

## API used

**ExchangeRate-API (open access endpoint)**
- Docs: https://www.exchangerate-api.com/docs/free
- Endpoint: `https://open.er-api.com/v6/latest/USD`
- No API key needed, updated once per day.


## Run locally

Requirements: a browser, and Python (optional, for a local server).

```
git clone https://github.com/nagasaro1-afk/currency-rate-checker.git
cd currency-rate-checker
python -m http.server 8000
```

Open http://localhost:8000. You can also just double-click `index.html`.

## Deployment

The lab runs three Docker containers on one machine: `web-01`, `web-02` and `lb-01`.

**1. Start the servers** (PowerShell, inside the `web_infra_lab` folder):

```
$ENV:DOCKER_BUILDKIT=0; docker compose up -d --build
docker compose ps
```

All three containers should show as running.

**2. Deploy the app on Web01 and Web02**

Log in with `ssh ubuntu@localhost -p 2211` (Web01) and `ssh ubuntu@localhost -p 2212` (Web02), then run on each:

```
sudo apt update && sudo apt install -y nginx git
git clone https://github.com/nagasaro1-afk/currency-rate-checker.git
sudo cp currency-rate-checker/{index.html,style.css,script.js} /var/www/html/
sudo service nginx start
```

Check: http://localhost:8080 (Web01) and http://localhost:8081 (Web02).

**3. Configure the load balancer on Lb01**

Log in with `ssh ubuntu@localhost -p 2210`.

1. Install nginx and OpenSSL, then create a self-signed certificate:
   ```
   sudo apt update && sudo apt install -y nginx openssl
   sudo openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
     -keyout /etc/ssl/private/lb_ssl.key -out /etc/ssl/certs/lb_ssl.crt -subj "/CN=localhost"
   ```
2. Create `/etc/nginx/sites-available/loadbalancer`:
   ```
   upstream backend_servers {
       server web-01:80;
       server web-02:80;
   }

   server {
       listen 80 default_server;
       server_name _;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl default_server;
       server_name _;

       ssl_certificate     /etc/ssl/certs/lb_ssl.crt;
       ssl_certificate_key /etc/ssl/private/lb_ssl.key;
       ssl_protocols       TLSv1.2 TLSv1.3;

       location / {
           proxy_pass http://backend_servers;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           add_header X-Served-By $upstream_addr always;
       }
   }
   ```
3. Enable the site, remove the default one, and restart:
   ```
   sudo ln -sf /etc/nginx/sites-available/loadbalancer /etc/nginx/sites-enabled/loadbalancer
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo sed -i 's/worker_processes.*/worker_processes 1;/' /etc/nginx/nginx.conf
   sudo nginx -t && sudo service nginx restart
   ```

How it works: the `upstream` block lists both web servers and nginx distributes requests between them using round-robin (its default). Port 80 redirects to HTTPS, and port 443 handles SSL and forwards requests to the backends. The `X-Served-By` header shows which server answered. `worker_processes 1` keeps the alternation clean for testing.

## Testing

Open https://localhost:4443 (accept the self-signed certificate warning: Advanced, then Proceed). Then check the balancing from PowerShell:

```
1..4 | % { curl.exe -sk -I https://localhost:4443 | Select-String x-served-by}
```

Run it several times. The header alternates between `172.25.0.11:80` (Web01) and `172.25.0.12:80` (Web02), which confirms traffic is shared between both servers. The app works the same whichever server answers.

## Error handling

The API call is wrapped in `try/catch`. If the API is unreachable or returns a non-success result, the page shows "Could not load rates" with the reason instead of breaking.

## Challenges

- **No-key API:** I needed an up-to-date API without secrets in a public repo, so I used the ExchangeRate-API open endpoint.
- **No `systemctl` in containers:** the lab containers have no systemd, so I started nginx with `sudo service nginx start`.
- **A typo bug:** `Show()` instead of `show()` stopped the table from loading. I found it in the browser console and fixed it.
- **Self-signed certificate:** browsers warn about it. It is expected for this lab, and I proceed past the warning.

## Credits

- [ExchangeRate-API](https://www.exchangerate-api.com) for the exchange rate data
- [Nginx](https://nginx.org) for the web servers and load balancer
- [Docker](https://www.docker.com) and the ALU web infrastructure lab for the server environment
