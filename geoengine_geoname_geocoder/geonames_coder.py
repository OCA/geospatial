# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
#TODO create a base Geocoder module
from urllib import urlencode
from urllib2 import urlopen
import xml.dom.minidom
import logging

from shapely.geometry import Point

from osv import fields, osv
from openerp.osv.osv import except_osv
from tools.translate import _


logger = logging.getLogger('GeoNames address encoding')

class ResPartnerAddress(osv.osv):
    """Auto gheo coding of addresses"""
    _name = "res.partner.address"
    _inherit = "res.partner.address"
    
    
    def _can_geocode(self, cursor, uid, context):
        usr = self.pool.get('res.users')
        return usr.browse(cursor, uid, uid, context).company_id.enable_geocoding
    
    def _get_point_from_reply(self, answer):
        """Parse geoname answer code inpired by geopy library"""
        
        def get_first_text(node, tag_names, strip=None):
            """Get the text value of the first child of ``node`` with tag
            ``tag_name``. The text is stripped using the value of ``strip``."""
            if isinstance(tag_names, basestring):
                tag_names = [tag_names]
            if node:
                while tag_names:
                    nodes = node.getElementsByTagName(tag_names.pop(0))
                    if nodes:
                        child = nodes[0].firstChild
                        return child and child.nodeValue.strip(strip)

        def parse_code(code):
            latitude = get_first_text(code, 'lat') or None
            longitude = get_first_text(code, 'lng') or None
            latitude = latitude and float(latitude)
            longitude = longitude and float(longitude)
            return Point(longitude, latitude)
            
        res = answer.read()
        if not isinstance(res, basestring):
            return False
        doc = xml.dom.minidom.parseString(res)
        codes = doc.getElementsByTagName('code')
        if len(codes) < 1:
            return False
        return parse_code(codes[0])
        

    
    def geocode_from_geonames(self, cursor, uid, ids, srid='900913', strict=True, context=None):
        context = context or {}
        base_url = u'http://ws.geonames.org/postalCodeSearch?'
        filters = {}
        if not isinstance(ids, list):
            ids = [ids]
        for add in self.browse(cursor, uid, ids, context):
            logger.info('geolocalize %s' % (add.name,))
            if add.country_id.code and (add.city or add.zip):
                filters[u'country'] = add.country_id.code.encode('utf-8')
                if add.city:
                    filters[u'placename'] = add.city.encode('utf-8')
                if add.zip:
                    filters[u'postalcode'] = add.zip.encode('utf-8')
                filters[u'maxRows'] = u'1'
                try:
                    url = base_url + urlencode(filters)
                    answer = urlopen(url)
                    data = {'geo_point': self._get_point_from_reply(answer)}
                    add.write(data)
                    # We use postgres to do projection in order not to install GDAL dependences
                    sql = ("UPDATE res_partner_address"
                           "  SET geo_point = ST_Transform(st_SetSRID(geo_point, 4326), %s)"
                           "  where id = %s")
                    cursor.execute(sql, (srid, add.id))
                except Exception, exc:
                    logger.error(exc)
                    if strict:
                        raise except_osv(_('Geoencoding fails'), str(exc))
        return ids
        
    def write(self, cursor, uid, ids, vals, context=None):
        res = super(ResPartnerAddress, self).write(cursor, uid, ids, vals, context=None)
        do_geocode = self._can_geocode(cursor, uid, context)
        if do_geocode and "country_id" in vals or 'city' in vals or 'zip' in vals:
            self.geocode_from_geonames(cursor, uid, ids, context=context)
        return res
        
    def create(self, cursor, uid, vals, context=None):
        res = super(ResPartnerAddress, self).create(cursor, uid, vals, context=None)
        do_geocode = self._can_geocode(cursor, uid, context=context)
        if do_geocode:
            self.geocode_from_geonames(cursor, uid, res, context=context)
        return res
ResPartnerAddress()
