# Copyright (C) 2019, Open Source Integrators
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{
    'name': 'Google Map View',
    'summary': 'Add a Google Map view type to the Odoo web client',
    'version': '12.0.2.0.0',
    'author': 'Open Source Integrators, Odoo Community Association (OCA)',
    'website': 'https://github.com/OCA/geospatial',
    'license': 'AGPL-3',
    'category': 'Extra Tools',
    'depends': [
        'base_google_map',
        'contacts',
    ],
    'data': [
        'data/google_maps_libraries.xml',
        'data/ir_config_parameter.xml',
        'views/google_places_template.xml',
        'views/res_partner.xml',
    ],
    'images': ['static/description/thumbnails.png'],
    'qweb': ['static/src/xml/widget_places.xml'],
    'installable': True,
    'pre_init_hook': 'pre_init_hook',
    'post_init_hook': 'post_init_hook',
    'uninstall_hook': 'uninstall_hook',
    'maintainers': [
        'gityopie',
        'wolfhall'
    ],
}
