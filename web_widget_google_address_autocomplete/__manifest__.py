# Copyright (C) 2019, Open Source Integrators
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
{
    'name': 'Google Address Form Autocomplete',
    'version': '12.0.1.0.0',
    'author': 'Open Source Integrators, Odoo Community Association (OCA)',
    'summary': 'Enable Google Address form autocomplete on Website sale'
    ' customer form',
    'website': 'https://github.com/OCA/geospatial',
    'category': 'Extra Tools',
    'license': 'AGPL-3',
    'depends': [
        'website_sale',
        'web_view_google_map'
    ],
    'data': [
        'views/template.xml',
        'views/res_config_settings.xml'
    ],
    'maintainers': [
        'gityopie',
        'wolfhall'
    ],
    'installable': True
}
