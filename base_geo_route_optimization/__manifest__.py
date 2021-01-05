# Copyright (C) 2020 Brian McMaster <brian@mcmpest.com>
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
{
    "name": "Geo Route Optimization",
    "summary": "Base logic to optimize driving routes between records",
    "version": "12.0.1.0.0",
    "category": "Extra Tools",
    "author": "Brian McMaster, Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/geospatial",
    "depends": ["base_setup",],
    "data": ["views/res_config_settings.xml",],
    "license": "AGPL-3",
    "development_status": "Beta",
    "maintainers": ["brian10048",],
    "external_dependencies": {"python": ["ortools",],},
}
