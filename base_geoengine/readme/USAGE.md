## Geoengine Demo

1.  As a user/admin, when I am in the Geoengine Demo module and I go to
    the ZIP menu. When I click on an item in the list view, I get to the
    form view showing me the different information about the ZIP. We can
    see its ZIP, city, priority, total sales and his spatial
    representation.
2.  As a user, I can't modify the information in the form view.
3.  As an admin, I can modify the information in the form view. I can
    click on the bin button to clear the map and I can draw a new shape.
4.  As a user, when I go the "Retail machines" tab and there are no
    items to display, it does not show me anything.
5.  As an admin, when I go the "Retail machines" tab and there are no
    items to display, the list view of the retail machines suggests to
    me to add a new line.
6.  As a user/admin, if there are items to be displayed in the "Retail
    machines" tab then I can click on an item and the retail machines
    form view will be displayed. We can see its spatial representation
    by going to "The point" tab and its attributes in "Attributes" tab.
7.  As a user/admin, when I go to the geoengine zip view by clicking on
    the map button at the top right of the screen. The geoengine view
    appears with the first 80 results displayed on the map. The vector
    layers selected are those defined as "active on startup" by the
    admin. The selected raster layer is the first one that is not an
    overlay layer.
8.  As a user/admin, when I hover over an area on the map, the area
    changes its style.
9.  As a user/admin, when I click on an area, a popup appears an I can
    see the different information about the area. If I click on the
    cross, the popup will disappear. If I click somewhere else on the
    map, the popup will also disappear. If I click on the about button,
    then the form view will be displayed.
10. As a user/admin, when I use the paging system, then the results
    displayed on the map are different (corresponding to the request).
11. As a user/admin, if we use the search bar, we can search results by
    his zip or his city.
12. As an admin, if I change the sequence of layers with the handle
    button then the change are persisted in database.
13. As a user, if I change the sequence of layers with the handle button
    then the change are not persisted in database. There are just the
    changes in the display.
14. As an admin, if I change the domain of a layer with the filter
    button then the change are persisted in database.
15. As a user, if I change the domain of a layer with the filter button
    then the change are not persisted in database. There are just the
    changes in the display.
16. As an admin, I have the possibility to edit the layer with its
    corresponding button.
17. As a user/admin, I can open/close LayerPanel with its button.
18. As a user/admin, I can open/close RecordsPanel with its button.
19. As a user/admin, when I click on a record in RecordsPanel, a move is
    made on the map to the selected record.
20. As a user/admin, when I click on a record in RecordsPanel, I can
    also click on the left magnifying glass to zoom on the record.
21. As a user/admin, when I click on a record in RecordsPanel, I can
    also click on the right magnifying glass to get the original zoom.
22. As a user/admin, I can use the search bar to search in the
    RecordsPanel.
23. As an admin,If the geoengine view is in edit mode, I can create new
    records by drawing them in the view.
24. As an admin, If the geoengine view is in edit mode, I can modify its
    spatial representation.

## Geoengine Backend

1.  As an admin, if I go into the configuration of the raster layers and
    it has elements, I can click on one and see its information.
2.  As an admin, if I want to create a new raster layer, I can click on
    "NEW" and fill out the form. The required fields for OpenStreetMap
    type are "Layer Name" and "Related View". If we want to have a WMTS
    (Web Map Tile Service) raster type. The required fields in addition
    to the precedents are "Service URL", "Matrix set","Format",
    "Projection" and "Resolutions". If we take WMS (Web Map Service)
    raster type, then the required fields are "Layer Name", "Related
    View", "Service URL", "Params", "Server Type".
3.  As an admin,if I go into the configuration of the vector layers and
    it has elements, I can click on one and see its information.
4.  As an admin, if I want to create a new vector layer, I can click on
    "NEW" and fill out the form. The required fields are "Layer Name",
    "Related View", "Geo field" and "Representation mode".
