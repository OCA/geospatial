# Copyright (C) 2019, Open Source Integrators
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{
    'name': 'Google Map View',
    'summary': 'Add a Google Map view type to the Odoo web client',
    'version': '12.0.1.1.0',
    'author': 'Open Source Integrators, Odoo Community Association (OCA)',
    'website': 'https://github.com/OCA/geospatial',
    'license': 'AGPL-3',
    'category': 'Extra Tools',
    'depends': [
        'base_google_map',
        'contacts',
    ],
    'data': [
        'views/google_places_template.xml',
        'views/res_partner.xml',
    ],
    'images': ['static/description/thumbnails.png'],
    'qweb': ['static/src/xml/widget_places.xml'],
    'installable': True,
    'uninstall_hook': 'uninstall_hook',
    'maintainers': [
        'gityopie',
        'wolfhall'
    ],
}
