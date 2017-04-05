# -*- coding: utf-8 -*-
# Copyright 2011-2012 Nicolas Bessi <nicolas.bessi@camptocamp.com>
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{'name': 'Geospatial support of partners',
 'version': '10.0.1.0.0',
 'category': 'GeoBI',
 'author': "Camptocamp, Odoo Community Association (OCA)",
 'license': 'AGPL-3',
 'website': 'http://openerp.camptocamp.com',
 'depends': [
     'base',
     'base_geoengine'
 ],
 'data': [
     'views/geo_partner_view.xml'
 ],
 'installable': True,
 'application': True,
 'active': False,
 }
