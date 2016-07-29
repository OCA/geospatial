# -*- coding: utf-8 -*-
# © 2011-2015 Nicolas Bessi (Camptocamp SA)
# © 2016 Yannick Vaucher (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
{'name': 'Geospatial support for Odoo',
 'version': '9.0.1.2.5',
 'category': 'GeoBI',
 'author': "Camptocamp,ACSONE SA/NV,Odoo Community Association (OCA)",
 'license': 'AGPL-3',
 'website': 'http://openerp.camptocamp.com',
 'depends': [
     'base',
     'web'
 ],
 'init_xml': [],
 'data': [
     'security/data.xml',
     'data/geo_raster_layer_type.xml',
     'views/base_geoengine_view.xml',
     'geo_ir/ir_model_view.xml',
     'geo_view/ir_view_view.xml',
     'geo_view/geo_raster_layer_view.xml',
     'geo_view/geo_vector_layer_view.xml',
     'security/ir.model.access.csv',
 ],
 'external_dependencies': {
     'python': ['shapely',
                'geojson'],
 },
 'qweb': ["static/src/xml/geoengine.xml"],
 'installable': True,
 'pre_init_hook': 'init_postgis',
 }
