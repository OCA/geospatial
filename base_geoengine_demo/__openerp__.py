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
        Geo spatial sample module for geospatial use
    """,
    'author': 'Camptocamp',
    'website': 'http://openerp.camptocamp.com',
    'depends': ['base_geoengine'],
    'init_xml': [],
    'update_xml': ['zip_view.xml',
                   'retail_machine_view.xml',
                   'data/retail_machine_geom.xml',
                   'data/npa_geom.xml'],
    'demo_xml': [],
    'installable': True,
    'active': False,
    'application': True
}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
