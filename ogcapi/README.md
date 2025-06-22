# Odoo OGC API Module

This project provides an OGC API (Open Geospatial Consortium API) compliant module for [Odoo](https://www.odoo.com/). The module enables serving and managing geospatial data services via OGC API interfaces.

## Features

- OGC API endpoints: Landing Page, Conformance, Collections, Items, and OpenAPI
- Odoo portal integration
- Authentication via API key or Basic Auth
- JSON and HTML output support
- OpenAPI documentation with Swagger UI

## Installation

1. **Dependencies**
   - Odoo 16 or higher
   - PostgreSQL/PostGIS
   - Required Python packages (see Odoo requirements)

2. **Installation Steps**
   - Copy this module into the `volumes/odoo/odoo-modules/` directory.
   - Add this directory to the `addons_path` in your `odoo.conf`.
   - Start Odoo and install the module from the Apps menu.

## Usage

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/ogcapi` | Lists registered OGC APIs |
| `/ogcapi/<api_name>` | Landing page for a specific API |
| `/ogcapi/<api_name>/conformance` | OGC API conformance information |
| `/ogcapi/<api_name>/collections` | Lists collections for the API |
| `/ogcapi/<api_name>/collections/<collection_name>` | Collection details |
| `/ogcapi/<api_name>/collections/<collection_name>/items` | Features of the collection |
| `/ogcapi/<api_name>/collections/<collection_name>/items/<feature_id>` | Single feature details |
| `/ogcapi/<api_name>/collections/<collection_name>/schema` | Collection schema |
| `/ogcapi/<api_name>/api` | OpenAPI documentation (viewable with Swagger UI) |

### Authentication

All endpoints require authentication. Two methods are supported:
- **Basic Auth:**  
  `Authorization: Basic <base64(username:password)>`
- **Bearer Token (API Key):**  
  `Authorization: Bearer <api_key>`

### Example API Call

```bash
curl -H "Authorization: Bearer <api_key>" http://localhost:8069/ogcapi/my_api/collections
```

### Swagger UI

To view the OpenAPI documentation:
```
http://localhost:8069/ogcapi/<api_name>/api?f=html
```

## Contribution & License

- Contributions are welcome via pull requests.
- License: GNU Affero General Public License v3 (AGPL-3)

## Contact

- [Geon Information Technologies Inc.](https://www.geonbt.com.tr)
- [Nezih Gülesanlar](mailto:postanezih@gmail.com)

---

**Note:** This module is designed to work with Odoo's portal and web framework. For more details, please refer to the code and Odoo documentation.