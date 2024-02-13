#. Go to website (frontend)
#. Press 'Edit' button
#. Drag the 'Product Category' snippet to the place of the website that you want
#. Save changes


Theming
~~~~~~~

CSS Classes:

* ``.categ_container`` > The container per master category
* ``.categ_scroll_wrapper`` > The scrollable container wrapper
* ``.categ_scroll`` > The scrollable container
* ``.categ_tree_level`` > The category row (image + text)
* ``.main_tree_level`` > The first category row level displayed
* ``.categ_link`` > The link of the category row
* ``.categ_img`` > The container of the icon of the category row


You can use 'data-tree-level' attribute to select the category row of a selected
level (1-4 by design).

Also you can replace the entire template replacing the ``data-template`` attribute value
in the ``s_product_category_options`` view. You only need know that the name
of the variable that have all the categories is called ``object``.
