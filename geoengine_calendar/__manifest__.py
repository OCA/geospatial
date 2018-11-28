# -*- coding: utf-8 -*-
# Copyright 2018 KMEE INFORMATICA LTDA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{
    'name': 'Geoengine Calendar',
    'summary': """
        Geospatial support of calendar""",
    'version': '10.0.1.0.0',
    'license': 'AGPL-3',
    'author': 'KMEE INFORMATICA LTDA,Odoo Community Association (OCA)',
    'website': 'https://www.kmee.com.br',
    'depends': [
        'calendar',
        'base_geoengine',
    ],
    'data': [
        'views/calendar_event.xml',
    ],
    'demo': [
        'demo/calendar_event.xml',
    ],
}
