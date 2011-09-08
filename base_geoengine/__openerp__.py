#-*- coding: utf-8 -*-
##############################################################################
#
# Copyright (c) 2010 Camptocamp SA (http://www.camptocamp.com) 
# @autor Nicolas Bessi (nbessi)
# All Right Reserved
#
##############################################################################
{
    'name': 'Geo spatial support for OpenERP',
    'version': '0.1',
    'category': 'GeoBI',
    'description': """
        Geo spatial support based on postgis
        projection is set on company
        add the ability of server to server geojson
    """,
    'author': 'Camptocamp',
    'website': 'http://openerp.camptocamp.com',
    'depends': ['base'],
    'init_xml': [],
    'update_xml': ['company_view.xml',
                   'wizard/initialize_db_view.xml',
                   'geo_ir/ir_model_view.xml'],
    'demo_xml': [],
    'installable': True,
    'active': False,
}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
