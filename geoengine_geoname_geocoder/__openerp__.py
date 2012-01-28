# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
{'name': 'Auto Geocoding of partners',
 'version': '0.1',
 'category': 'GeoBI',
 'description': """ Automatically geocode addresses using http://www.geonames.org/ api.
 We use this API because it is free and has little data usage restriction and do not require an account.
 The limitation is that address is localized by city not by street. For more precize localisation you have to 
 use a non free API. Google maps APi limitation exclude the use of geocoded data in OpenERP.
 We are planning to create a bing based geocoder if service limnitation is OpenERP/Geoengine compatible.
 You can contact Camptocamp if you need to create a specific geocoder or acces geocoding services. 
 
 Technical notes:
 PostGIS must support projection (proj4) 
 We use postgis to do the reprojection in order to avoid gdal python deps.
 """,
 'update_xml': ['company_view.xml'],
 'author': 'Camptocamp',
 'website': 'http://openerp.camptocamp.com',
 'depends': ['base', 'sale', 'geoengine_partner'],
 'installable': True,
 'active': False,
}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
