1. Create a Mapbox account and a **public** (`pk.`) token at
   <https://account.mapbox.com/>.
2. Open **Settings → General Settings** and find **Mapbox Token** under
   Integrations.
3. Paste the public token and save. Backend forms that use
   `widget="mapbox"` then receive the token through the user session.
4. The browser must be able to reach `api.mapbox.com` (Mapbox GL JS,
   styles, and tiles).

The token stored here is a Mapbox public token. It is still a credential:
restrict who can change Settings, and do not treat it as anonymous data.
This module does **not** read or write the Enterprise `web_map` token
(`web_map.token_map_box` / `map_box_token`).
