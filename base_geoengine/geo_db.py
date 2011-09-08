# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
"""Helper to setup Postgis"""
import addons
import pooler

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