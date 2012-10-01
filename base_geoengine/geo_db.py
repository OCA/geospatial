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
"""Helper to setup Postgis"""
import addons
import pooler
import logging

logger = logging.getLogger('geoengine.sql')

def init_postgis(cursor):
    ## Create language may fail and it can be normal
    cursor.execute("SELECT tablename from pg_tables where tablename='spatial_ref_sys';")
    check = cursor.fetchone()
    if check:
        return {}
    db, pool = pooler.get_db_and_pool(cursor.dbname)
    mycursor = db.cursor()
    p = addons.get_module_resource('base_geoengine', 'postgis_sql','postgis.sql')
    postgis_sql = open(p).read()
    p = addons.get_module_resource('base_geoengine', 'postgis_sql','spatial_ref_sys.sql')
    spatial_ref_sys_sql = open(p).read()
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
