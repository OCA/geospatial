# Copyright 2025 Advanced Insight.
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
{
    "name": "Geospatial Plot",
    "summary": """Efficiently plots of land and agricultural data""",
    "website": "https://github.com/OCA/geospatial",
    "author": "Advance Insight, Odoo Community Association (OCA)",
    "category": "Geospatial",
    "version": "18.0.1.0.0",
    "license": "AGPL-3",
    "depends": [
        # Odoo Modules
        "base_geolocalize",
        "uom",
        "mail",
        # OCA Modules
        "web_leaflet_lib",
        "web_leaflet_draw_lib",
    ],
    "data": [
        "security/res_groups.xml",
        "security/ir.model.access.csv",
        "data/uom_uom_data.xml",
        "views/geospatial_plot_views.xml",
        "views/res_partner_views.xml",
        "views/ir_actions_act_window.xml",
        "views/ir_ui_menu.xml",
        "views/res_config_settings_views.xml",
    ],
    "demo": [
        "demo/res_partner_demo.xml",
        "demo/geospatial_plot_demo.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "geospatial_plot/static/src/components/map_widget/*",
        ],
    },
    "application": True,
    "installable": True,
    "auto_install": False,
}
