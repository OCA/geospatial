# Copyright Yopi Angi
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
{
    'name': 'Google Map View Drawing Mixin',
    'summary': 'Add drawing tools to Google Map view in Odoo',
    'version': '12.0.1.0.0',
    'author': 'Yopi Angi, Odoo Community Association (OCA)',
    'website': 'https://github.com/OCA/geospatial',
    'license': 'AGPL-3',
    'category': 'Extra Tools',
    'depends': [
        'web_view_google_map',
    ],
    'images': ['static/description/thumbnails.png'],
    'data': [
        'data/google_maps_library.xml',
        'views/template.xml',
        'views/res_config_settings_views.xml',
        'security/ir.model.access.csv',
    ],
    'qweb': ['static/src/xml/drawing.xml'],
    'installable': True,
    'maintainers': [
        'gityopie',
        'brian10048',
    ],
}
