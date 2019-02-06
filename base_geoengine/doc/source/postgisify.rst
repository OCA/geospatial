*********************************
Postgisify an exisiting database
*********************************

If you want to install the GeoEngine on an existing database you have two options.

If you are using a PostgreSQL super user it should work out of the box.
If you are using a standard user you have to connect to your database and run: ::

  CREATE EXTENSION postgis
  CREATE EXTENSION postgis_topology

In order to test if the installation is sucessfull log into you database and::

  SELECT * from GEOMETRY_COLUMNS;
  SELECT * from spatial_ref_sys;
