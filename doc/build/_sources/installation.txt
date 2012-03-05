=================
Installation
=================


***************************
PostGIS database template
***************************

In order to create database from OpenERP client you have to create a PostGis database template.
Under windows this template is allready available in installer.

On other *NIX system you simply have to launch the create_postgis_template.sh script available in the base_geoengine module in scripts folder.
This should be done by a PostgreSQL superuser.

In order to test the succes::

 psql -l
 template_postgis                | owner                               | UTF8     | en_US.UTF-8 | en_US.UTF-8 |


If you want to install geoengine on an exisiting database please refere to the Postgisify section.

***************
OpenERP
***************

Add the template as an argument to OpenERP server::

 --db-template=template_postgis
 
or in config file::

 db_template = template_postgis
 

Do not forget do add GeoEngine modules to your addons path.
 
Then install (eventually update module list) the base GeoEngine module form OpenERP client.
