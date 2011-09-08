# -*- coding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
#
##############################################################################
import logging
import base64

import pooler
from osv import fields, osv
from tools.translate import _

logger = logging.getLogger('GeoEngine Posgis init')

class PostgisDatabaseEnabler(osv.osv_memory):
    _name = 'geoengine.postgis.initializer'
    _rec_name = 'GeoEngine Initializer'
    _columns = {
        'postgis_file': fields.binary('postgis.sql file', required=True,
                                      help='postgis.sql file find in postgres/postgis contrib.'),
        'spatial_ref_sys': fields.binary('spatial_ref_sys.sql file', required=True,
                                      help='spatial_ref_sys.sql file find in postgres/postgis contrib.')
    }

    def init_postgis(self, cursor, uid, ids, context):
        if isinstance(ids, list):
            req_id = ids[0]
        else:
            req_id = ids
        current = self.browse(cursor, uid, req_id, context)
        postgis_sql = base64.decodestring(current.postgis_file)
        spatial_ref_sys_sql = base64.decodestring(current.spatial_ref_sys)
        ## Create language may fail and it can be normal
        db, pool = pooler.get_db_and_pool(cursor.dbname)
        mycursor = db.cursor()
        try:
            mycursor.execute('CREATE LANGUAGE plpgsql');
            mycursor.commit()
        except Exception, exc:
            mycursor.rollback()
            logger.warning('Can not create LANGUAGE plpgsql')
        finally:
            mycursor.close()

        try:
            cursor.execute(postgis_sql)
        except Exception, exc:
            raise osv.except_osv(_('Error, Can not initialize spatial postgis function.'
                                   ' Database user may have to be superuser'
                                   ' and postgres/postgis extentions and dev header have to be installed'),
                                 str(exc))
        try:
            cursor.execute(spatial_ref_sys_sql)
        except Exception, exc:
            raise osv.except_osv(_('Error, Can not initialize spatial reference table.'),
                                 str(exc))
        return {}


PostgisDatabaseEnabler()
