# OGC API Module for Odoo

## Overview

The OGC API module implements the OGC API - Features standard on Odoo 16, allowing you
to publish and manage geospatial data via modern, RESTful HTTP APIs. The module provides
standardized access to geospatial features and metadata, following Open Geospatial
Consortium (OGC) specifications.

## Features

- **OGC API - Features endpoints:** Landing page, Conformance, Collections, Items
- **GeoJSON and JSON support**
- **Paging and spatial filtering (bbox, limit, offset)**
- **CRS transformation and definitions**
- **OpenAPI 3.0 documentation**
- **Authentication (Bearer Token, Basic Auth)**
- **Admin interface for managing APIs, collections, CRS, keywords, and metadata**
- **Extensible architecture and comprehensive test coverage**

## Module Structure

```
ogcapi/
├── controllers/         # HTTP controllers for API endpoints
├── data/                # API configuration data
├── i18n/                # Translation files
├── models/              # Odoo models (API, collection, CRS, etc.)
├── security/            # Access rules and authentication
├── static/              # Static files (OpenAPI schemas, CSS, JS)
├── tests/               # Test modules
├── views/               # XML view definitions
├── __init__.py          # Module initialization
└── __manifest__.py      # Module metadata
```

## Installation

1. Add the following line to your Odoo configuration file:
   ```
   server_wide_modules = web, base, ogcapi
   ```
2. Copy the module to your Odoo addons directory.
3. Add the module path to your Odoo configuration.
4. Restart the Odoo server.
5. Install the module from the Apps menu.

## Configuration

- **OGC API Definition:** Create new API records from OGC API → APIs menu.
- **Collection Management:** Add collections and link them to Odoo models from OGC API →
  Collections menu.
- **CRS Definitions:** Manage CRS records from OGC API → CRS Definitions menu.

## API Endpoints

| Endpoint                                                              | Description             | Method |
| --------------------------------------------------------------------- | ----------------------- | ------ |
| `/ogcapi/<api_name>`                                                  | Landing page            | GET    |
| `/ogcapi/<api_name>/conformance`                                      | Conformance information | GET    |
| `/ogcapi/<api_name>/collections`                                      | List of collections     | GET    |
| `/ogcapi/<api_name>/collections/<collection_name>`                    | Collection details      | GET    |
| `/ogcapi/<api_name>/collections/<collection_name>/items`              | Feature collection      | GET    |
| `/ogcapi/<api_name>/collections/<collection_name>/items/<feature_id>` | Single feature          | GET    |
| `/ogcapi/<api_name>/collections/<collection_name>/schema`             | Collection schema       | GET    |
| `/ogcapi/<api_name>/api`                                              | OpenAPI documentation   | GET    |

## Authentication

- Bearer Token (Odoo API key)
- Basic Authentication

## Testing

Use the `tests/` directory and Odoo's test infrastructure for automated testing.

## License

This module is licensed under the GNU Affero General Public License v3. See
[LICENSE.txt](LICENSE.txt) for details.

## Authors

- OGC API module development team

## Support

For questions and support, use the Odoo community forums or contact the module
maintainers.
