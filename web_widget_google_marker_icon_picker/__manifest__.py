# Copyright (C) 2019, Open Source Integrators
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
{
    'name': 'Google Marker Icon Picker',
    'summary': "Google map widget allowing to set marker's color",
    'version': '12.0.1.1.0',
    'author': 'Open Source Integrators, Odoo Community Association (OCA)',
    'website': 'https://github.com/OCA/geospatial',
    'license': 'AGPL-3',
    'category': 'Extra Tools',
    'depends': ['web_view_google_map'],
    'data': [
        'views/template.xml',
    ],
    'qweb': ['static/src/xml/marker_color.xml'],
    'maintainers': [
        'gityopie',
        'wolfhall'
    ],
    'installable': True
}
