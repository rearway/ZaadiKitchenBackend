Meal Options Enhancement
Implementation scope and effort estimate
Platio Kitchen
8 October 2026
1. Overview
Platio Kitchen currently supports two meal streams: Executive and Salad. The enhancement will allow the kitchen team to configure multiple dishes under each stream for a delivery day, instead of being limited to one dish per stream.
Customers will be able to view both Executive and Salad menus for their scheduled delivery days. The app will clearly show the customer's current selection as well as the other available dishes. Each customer will continue to receive one meal per scheduled delivery day.
Area
Current
After enhancement
Meal streams
Executive and Salad
Executive and Salad (unchanged)
Dishes per stream/day
One dish
Multiple dishes, configured by admin
Customer menu visibility
Current menu structure
Both Executive and Salad menus visible
Customer view
Applicable dish
Current selection plus available alternatives
Delivery per day
One meal
One meal (unchanged)
Subscription / pricing
Existing plans
No change


2. Functional Scope
2.1 Admin portal
The menu planner will be updated to give the Platio Kitchen team flexibility to add multiple dishes under both Executive and Salad for each delivery day.
Admin can add and manage multiple dishes within the Executive stream for a delivery day.
Admin can add and manage multiple dishes within the Salad stream for a delivery day.
One dish within each applicable stream/day is configured as the default when a customer has not made a selection.
Existing meal-library and menu-management functions will be reused where practical.
Publishing will validate that the required menu and default configuration is complete.
2.2 Customer mobile app
For each relevant delivery day, the customer will be able to see the available menu across both Executive and Salad, rather than being restricted to viewing only the dishes under the customer's current meal type.
Show both Executive and Salad sections and the dishes available under each.
Clearly identify the customer's currently selected meal.
Show the other available dishes so the customer can understand the available choices.
Support meal selection for upcoming scheduled deliveries in line with the final agreed selection rules.
Apply the existing 6:00 PM Saudi time day-before cutoff to changes.
After the cutoff, show the applicable meal as read-only.
Skipped or completed delivery days cannot be changed.
Any interaction between dish selection and switching Executive/Salad will follow the final frozen requirement.
2.3 Backend and data
The backend must support more than one dish within a meal stream and retain the specific dish applicable to each customer delivery. This removes the current assumption that a delivery date and meal type always identify a single dish.
Support multiple menu entries per delivery date and meal stream.
Store or resolve the customer's selected dish for the relevant delivery day.
Support default-dish handling when the customer has not made a selection.
Extend menu and subscription APIs to return available dishes, current selection and effective meal information.
Update dependent services so the same effective dish is used consistently across customer, operations and reporting flows.
3. Downstream Changes
Several existing modules currently resolve meal information from the published menu and meal type. These areas need to use the specific selected or default dish once multiple dishes are available within the same stream.
Module
Required change
Impact
Daily operations
Show operational counts and meal information by actual dish where required.
Medium
Labels / exports
Use the specific dish applicable to each customer delivery.
Medium
Home / My Plan
Show the customer's selected or default dish and available menu information.
Medium
Meal type switching
Keep dish selection consistent with the final Executive/Salad switching rules.
Medium
Ratings & history
Associate feedback and history with the dish actually delivered.
Medium
Rider / delivery view
Use the correct dish wherever meal information is displayed.
Medium
ERP integration
Verify the existing daily-order mapping and update it where required so the menu code represents the selected or default dish.
Medium
Customer history / issues
Reference the correct delivered dish where meal information is shown.
Low


4. Meal Resolution
For operational consistency, each scheduled delivery must resolve to one effective dish. The final resolution rules will be confirmed as part of requirements freeze, including how dish selection interacts with Executive/Salad switching.
Where the customer has a valid selection, use that selected dish.
Where no selection has been made, use the configured default for the applicable stream/day.
Use the same resolved dish consistently for operations, labels, ERP mapping, rider information, ratings and history.
5. Technical Changes
Area
Change
Menu data
Support multiple dishes per date and meal stream, including default configuration.
Delivery data
Retain or resolve the specific dish applicable to each customer delivery.
Admin APIs
Return and manage multiple dishes per stream and default configuration.
Customer menu APIs
Return both Executive and Salad menus, available dishes, current selection and effective meal information.
Meal-selection APIs
Read and save customer meal choices for upcoming delivery dates.
Dependent services
Update home, deliveries, history, ratings, operations, rider and relevant ERP mapping.
Documentation
Update relevant API references and test collections after implementation.


6. Effort Estimate
Estimated effort is 17 person-days once the requirements are frozen and the final interaction rules are agreed. The estimate covers implementation, integration, testing, UAT support and release activities for the scope described here.
Workstream
Scope
Person-days
Backend & database
Data changes; admin/customer APIs; selection and default logic; dependent backend flows; relevant ERP/ops/rider updates.
6.0
Admin portal
Multiple dishes under Executive/Salad, default controls, menu validation and regression updates.
2.0
Customer mobile app
Both menu streams, current selection and alternatives, meal-selection experience, states, API integration and edge cases.
4.0
Operations & integrations
Kitchen/label updates, delivery/rider display changes and ERP mapping verification/integration where required.
1.5
QA & UAT
End-to-end scenarios, regression testing, edge cases and UAT fixes.
2.5
Deployment & release
Production deployment, migration verification and post-release checks.
1.0
Total estimated effort
17.0


The 17 person-days will be treated as the implementation estimate after requirements freeze. Changes or additions requested after requirements are frozen will be reviewed separately for effort and timeline impact.
7. Requirements to Freeze
The number of dishes the admin may configure under each stream, if a maximum is required.
8. Scope Notes
Subscription plans, pricing, skip/pause/cancel behaviour and the number of deliveries remain unchanged. The enhancement changes menu configuration, visibility and dish selection; it does not create an additional meal delivery.
ERP scope is limited to verification and any changes required to ensure the existing menu-code mapping represents the customer's selected or default dish. The current API reference does not document the ERP payload in sufficient detail to assume a larger ERP redesign.



other requirements

- Notifying the admin when a customer requests a new area.
- Calculating and displaying star ratings at the cuisine level in the admin dashboard.
- Allowing pricing to be updated directly from the admin dashboard.

