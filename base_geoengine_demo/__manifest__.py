# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
{'name': 'Geo spatial support Demo',
 'version': '12.0.1.0.0',
 'category': 'GeoBI',
 'author': "Camptocamp,Odoo Community Association (OCA)",
 'license': 'AGPL-3',
 'website': 'http://openerp.camptocamp.com',
 'depends': [
     'base_geoengine'
 ],
 'data': [
     'views/menus.xml',
     'views/zip.xml',
     'views/retail_machine.xml',
     'data/retail_machine_geom.xml',
     'data/npa_geom.xml',
     'security/ir.model.access.csv'
 ],
 'external_dependencies': {
     'python': [
         'geojson',
     ],
 },
 'installable': True,
 'application': True,
 }
