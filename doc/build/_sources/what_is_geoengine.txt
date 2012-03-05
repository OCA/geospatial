=================
What is GeoEngine
=================

GeoEngine is an OpenERP module that adds spatial/GIS abilities to OpenERP. It will allows you to :

* Visualize and query your business informations on map
* Do GeoBI and spatial query
* Configure your spatial layer and spatial datasources
* Extends OpenERP models with spatial columns

GeoEngine relies on `OpenLayers <http://openlayers.org>`_ and `PostgGIS <http://postgis.refractions.net/>`_ technologies.

Postgis is used to stored spatial informations in database. OpenLayer is used to represent spatial data in other words to show maps. GeoEngine module act as data provider and as an OpenLayers configurator. It also provides a complete extension to OpenERP ORM.

.. image:: _static/_images/core_architecture.jpg
