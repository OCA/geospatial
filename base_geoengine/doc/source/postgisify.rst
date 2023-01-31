*********************************
Postgisify an exisiting database
*********************************

If you want to install the GeoEngine on an existing database, you have to run the sql commands available in your system postgres/postgis contrib or as last option in the base_geoengine module under the postgis_sql folder.

You  using a PostgreSQL super user so you have to temporary set the owner of openerp database as super user::

 psql -U superuser my database -f postgis.sql
 psql -U superuser my database -f spatial_ref_sys.sql
 
In order to test if the installation is sucessfull log into you database and::

 SELECT * from GEOMETRY_COLUMNS;
 SELECT * from spatial_ref_sys;