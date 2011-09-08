# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
{
    'name': 'Geospatial support for OpenERP',
    'version': '0.1',
    'category': 'GeoBI',
    'description': """
        Geospatial support based on PostGIS
        add the ability of server to server geojson
        to do geo CRUD and view definition
    """,
    'author': 'Camptocamp',
    'website': 'http://openerp.camptocamp.com',
    'depends': ['base'],
    'init_xml': [],
    'update_xml': ['company_view.xml',
                   'geo_ir/ir_model_view.xml'],
    'demo_xml': [],
    'installable': True,
    'active': False,
}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
