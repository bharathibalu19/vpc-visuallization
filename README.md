# vpc-visual

An animated, beginner-friendly diagram that explains an **AWS VPC** step by step, told as the story of a gated housing society owned by a shop owner named Bharathi. No IT background needed: every technical term comes with an everyday analogy.

Plain HTML, CSS and JavaScript. No build step, no dependencies.

| Technical term | Analogy |
|---|---|
| VPC | Fenced plot of land |
| Subnet | Lobby (public) / flats (private) |
| Internet Gateway | Main gate |
| NAT Gateway | Delivery counter |
| Security Group | Door guard |
| Network ACL | Gate guard |
| Load Balancer | Receptionist |
| VPN | Secret tunnel |
| VPC peering | Private road |

## The moving objects

| Packet | Meaning |
|---|---|
| ✉️ Envelope | A visitor request |
| 💾 Floppy disk | Data moving web → app → database |
| 🔁 Repeat arrows | Database replication between zones |
| 📦 Package | A software update leaving through NAT |
| 😈 Devil | An intruder (gets blocked) |
| 🔒 Lock | Office traffic through the VPN |
| 🤝 Handshake | Partner traffic over VPC peering |

## The 9 steps

Clicking a step shows it and everything before it. Clicking an earlier step goes back.

1. **VPC** - AWS Cloud region and the VPC (10.0.0.0/16).
2. **Availability Zones** - two buildings, A and B.
3. **Subnets** - public (gold) and private (purple) in each zone.
4. **Internet Gateway** - the main gate, the internet, visitors, route table.
5. **Load balancer + web servers** - requests shared between zones.
6. **App servers + database** - plus a live-copy database in zone B.
7. **NAT Gateway** - software updates leave through the delivery counter.
8. **Security** - SG guards, NACL guards, and a blocked intruder.
9. **VPN + peering** - the office tunnel and a partner VPC.

Use **Auto-play** to advance every 5 seconds and **Reset** to start again.

## Run locally

```bash
cd vpc-visual
python3 -m http.server 8000
```

Open <http://localhost:8000>. (Opening `index.html` directly also works in most browsers.)

## Host on GitHub Pages

1. Create a new repository on GitHub and upload the contents of the `vpc-visual` folder (including the hidden `.nojekyll` file) to the `main` branch.
2. Open the repository's **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/ (root)**, then click **Save**.
5. Wait a minute, then open `https://<your-username>.github.io/<repository-name>/`.

## Project structure

```
vpc-visual/
  index.html     page structure only
  css/style.css  layout, light/dark theme, animations
  js/app.js      builds the SVG, step data, caption text, auto-play
  .nojekyll      tells GitHub Pages to serve files as they are
  LICENSE        MIT licence (replace the Bharathi placeholder)
  README.md
```

## Customise

- **Text:** edit the `STEPS` array at the top of `js/app.js` (button title, subtitle, caption parts).
- **Diagram colours:** edit the `C` object in `js/app.js` (blue = cloud/zones, teal = VPC, gold = public, purple = private, red = security, green = office link).
- **Page colours:** edit the CSS variables at the top of `css/style.css` (separate values for light and dark mode).
- **Layout:** boxes and packets are created with small helper functions (`frame`, `node`, `tag`, `wire`, `packet`) using x/y coordinates in the 1100 x 620 viewBox.
- **Font:** change the Google Fonts link in `index.html` and `font-family` in `css/style.css`.

Accessibility: keyboard focus outlines are always visible, and `prefers-reduced-motion` freezes the animations.
