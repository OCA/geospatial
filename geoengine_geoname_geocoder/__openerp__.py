# -*- coding: utf-8 -*-
##############################################################################
#
#    Author: Nicolas Bessi
#    Copyright 2011-2012 Camptocamp SA
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
##############################################################################
{'name': 'Auto Geocoding of partners',
 'version': '0.1',
 'category': 'GeoBI',
 'description': """ Automatically geocode addresses using http://www.geonames.org/ api.
 We use this API because it is free and has little data usage restriction and do not require an account.
 The limitation is that address is localized by city not by street. For more precize localisation you have to 
 use a non free API. Google maps APi limitation exclude the use of geocoded data in OpenERP.
 You can contact Camptocamp if you need to create a specific geocoder or acces geocoding services. 
 
 Technical notes:
 PostGIS must support projection (proj4) 
 We use postgis to do the reprojection in order to avoid gdal python deps.
 """,
 'update_xml': ['company_view.xml', 'wizard/bulk_encode_view.xml'],
 'author': 'Camptocamp',
 'license': 'AGPL-3',
 'website': 'http://openerp.camptocamp.com',
 'depends': ['base', 'sale', 'geoengine_partner'],
 'installable': True,
 'active': False,
 'icon': '/base_geoengine/static/src/images/map_icon.png'}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
