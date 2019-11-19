# Copyright (C) 2019, Open Source Integrators
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{
    'name': 'Google Maps Integration',
    'summary': 'View modes and widgets to integrate Google Maps in your UI',
    'version': '12.0.1.0.0',
    'author': 'Open Source Integrators, Odoo Community Association (OCA)',
    'website': 'https://github.com/OCA/geospatial',
    'license': 'AGPL-3',
    'category': 'Extra Tools',
    'depends': [
        'base_setup',
        'base_geolocalize',
    ],
    'data': [
        'data/google_maps_libraries.xml',
        'views/res_config_settings.xml'
    ],
    'images': ['static/description/thumbnails.png'],
    'installable': True,
    'application': True,
    'maintainers': [
        'gityopie',
        'wolfhall'
    ],
}
