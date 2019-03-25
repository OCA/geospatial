# Copyright 2019 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
{
    'name': 'test-base-geoengine',
    'version': '12.0.1.0.0',
    'category': 'Tests',
    'author': "Camptocamp,ACSONE SA/NV,Odoo Community Association (OCA)",
    'license': 'AGPL-3',
    'website': 'https://github.com/OCA/geospatial',
    'depends': [
        'base_geoengine',
    ],
    'data': [
        'views.xml',
        'security/ir.model.access.csv',
    ],
    'installable': True,
    'auto_install': False,
}
