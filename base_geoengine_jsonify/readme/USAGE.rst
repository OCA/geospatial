Nothing to do!
If you add a geo_point to a json export, the point will be converted automatically
 to GeoJson format.
In e.g. ElasticSearch this is natively supported as the geo_shape type
(warning, geo_point is an available type but it does not support geojson).
