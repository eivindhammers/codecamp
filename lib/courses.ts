import { Course, Exercise } from "./types";

export const courses: Course[] = [
  // ─────────────────────────────────────────────────────
  // Introduction to R
  // ─────────────────────────────────────────────────────
  {
    slug: "intro-r",
    title: "Introduction to R",
    description:
      "Learn the fundamentals of R programming: data types, vectors, data frames, and basic visualisation.",
    language: "r",
    level: "beginner",
    category: "general",
    xpTotal: 300,
    icon: "🔵",
    tags: ["R", "beginner", "data types", "vectors"],
    chapters: [
      {
        id: "basics",
        title: "R Basics",
        description: "Variables, data types, and arithmetic in R.",
        exercises: [
          {
            id: "hello-r",
            title: "Hello, R!",
            instructions:
              "Use `print()` to display `\"Hello, R!\"` in the console.",
            hint: 'Type `print("Hello, R!")` and run the code.',
            starterCode: '# Print a greeting\nprint("Hello, World!")',
            sampleSolution: 'print("Hello, R!")',
            xp: 10,
          },
          {
            id: "arithmetic",
            title: "Basic Arithmetic",
            instructions:
              "Calculate the result of `7 * 6` and store it in a variable called `result`. Then print `result`.",
            hint: "Use the assignment operator `<-` to store values.",
            starterCode: "# Store the product of 7 and 6\nresult <- ___\nprint(result)",
            sampleSolution: "result <- 7 * 6\nprint(result)",
            xp: 10,
          },
          {
            id: "data-types",
            title: "Data Types",
            instructions:
              "Create a numeric variable `age` with value `30`, a character variable `name` with value `\"Alice\"`, and a logical variable `is_student` set to `TRUE`. Print all three.",
            hint: "Character values need quotes. Logical values are TRUE or FALSE (uppercase).",
            starterCode:
              "# Create variables of different types\nage <- ___\nname <- ___\nis_student <- ___\nprint(age)\nprint(name)\nprint(is_student)",
            sampleSolution:
              'age <- 30\nname <- "Alice"\nis_student <- TRUE\nprint(age)\nprint(name)\nprint(is_student)',
            xp: 10,
          },
        ],
      },
      {
        id: "vectors",
        title: "Vectors",
        description: "Creating and manipulating vectors in R.",
        exercises: [
          {
            id: "create-vector",
            title: "Create a Vector",
            instructions:
              "Create a numeric vector `scores` containing `85, 92, 78, 95, 88`. Print the vector and its length using `length()`.",
            hint: "Use `c()` to combine values into a vector.",
            starterCode:
              "# Create a vector of scores\nscores <- c(___)\nprint(scores)\nprint(length(scores))",
            sampleSolution:
              "scores <- c(85, 92, 78, 95, 88)\nprint(scores)\nprint(length(scores))",
            xp: 15,
          },
          {
            id: "vector-ops",
            title: "Vector Operations",
            instructions:
              "Given `prices <- c(10.5, 20.0, 15.75, 8.25)`, calculate the mean with `mean()`, the sum with `sum()`, and filter prices above 12 using subsetting.",
            hint: "Use `prices[prices > 12]` to filter elements.",
            starterCode:
              "prices <- c(10.5, 20.0, 15.75, 8.25)\n# Calculate mean\nprint(mean(prices))\n# Calculate sum\nprint(sum(prices))\n# Filter prices above 12\nprint(prices[___])",
            sampleSolution:
              "prices <- c(10.5, 20.0, 15.75, 8.25)\nprint(mean(prices))\nprint(sum(prices))\nprint(prices[prices > 12])",
            xp: 15,
          },
        ],
      },
      {
        id: "data-frames",
        title: "Data Frames",
        description: "Working with tabular data in R.",
        exercises: [
          {
            id: "create-df",
            title: "Create a Data Frame",
            instructions:
              "Create a data frame `employees` with columns `name` (`\"Alice\", \"Bob\", \"Carol\"`), `age` (`28, 35, 42`), and `salary` (`50000, 65000, 72000`). Print the data frame.",
            hint: "Use `data.frame()` with named arguments for each column.",
            starterCode:
              '# Create a data frame\nemployees <- data.frame(\n  name = c("Alice", "Bob", "Carol"),\n  age = c(___),\n  salary = c(___)\n)\nprint(employees)',
            sampleSolution:
              'employees <- data.frame(\n  name = c("Alice", "Bob", "Carol"),\n  age = c(28, 35, 42),\n  salary = c(50000, 65000, 72000)\n)\nprint(employees)',
            xp: 15,
          },
          {
            id: "df-subset",
            title: "Subsetting Data Frames",
            instructions:
              "Using the `employees` data frame, select only employees older than 30 and print their names and salaries.",
            hint: "Use `employees[employees$age > 30, c(\"name\", \"salary\")]`.",
            starterCode:
              'employees <- data.frame(\n  name = c("Alice", "Bob", "Carol"),\n  age = c(28, 35, 42),\n  salary = c(50000, 65000, 72000)\n)\n# Select employees older than 30\nsubset_df <- employees[___, ___]\nprint(subset_df)',
            sampleSolution:
              'employees <- data.frame(\n  name = c("Alice", "Bob", "Carol"),\n  age = c(28, 35, 42),\n  salary = c(50000, 65000, 72000)\n)\nsubset_df <- employees[employees$age > 30, c("name", "salary")]\nprint(subset_df)',
            xp: 20,
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────
  // Introduction to Python
  // ─────────────────────────────────────────────────────
  {
    slug: "intro-python",
    title: "Introduction to Python",
    description:
      "Learn Python from scratch: variables, lists, dictionaries, loops, and functions for data work.",
    language: "python",
    level: "beginner",
    category: "general",
    xpTotal: 300,
    icon: "🟡",
    tags: ["Python", "beginner", "lists", "functions"],
    chapters: [
      {
        id: "basics",
        title: "Python Basics",
        description: "Variables, data types, and control flow.",
        exercises: [
          {
            id: "hello-python",
            title: "Hello, Python!",
            instructions: "Print `\"Hello, Python!\"` using the `print()` function.",
            hint: 'Type `print("Hello, Python!")` and run.',
            starterCode: '# Print a greeting\nprint("Hello, World!")',
            sampleSolution: 'print("Hello, Python!")',
            xp: 10,
          },
          {
            id: "variables",
            title: "Variables and Types",
            instructions:
              "Create variables: `city = \"Oslo\"`, `population = 693494`, `gdp_per_capita = 82236.8`. Print each variable and its type using `type()`.",
            hint: "Use `print(type(variable))` to inspect the type.",
            starterCode:
              "# Define variables\ncity = ___\npopulation = ___\ngdp_per_capita = ___\n\n# Print each variable and its type\nprint(city, type(city))\nprint(population, type(population))\nprint(gdp_per_capita, type(gdp_per_capita))",
            sampleSolution:
              'city = "Oslo"\npopulation = 693494\ngdp_per_capita = 82236.8\nprint(city, type(city))\nprint(population, type(population))\nprint(gdp_per_capita, type(gdp_per_capita))',
            xp: 10,
          },
          {
            id: "conditionals",
            title: "Conditionals",
            instructions:
              "Write an `if/elif/else` statement: if `gdp > 50000` print `\"High income\"`, elif `gdp > 20000` print `\"Middle income\"`, else print `\"Low income\"`. Test with `gdp = 45000`.",
            hint: "Python uses `if`, `elif`, and `else` keywords with a colon at the end.",
            starterCode:
              "gdp = 45000\n\nif ___:\n    print(\"High income\")\nelif ___:\n    print(\"Middle income\")\nelse:\n    print(\"Low income\")",
            sampleSolution:
              'gdp = 45000\n\nif gdp > 50000:\n    print("High income")\nelif gdp > 20000:\n    print("Middle income")\nelse:\n    print("Low income")',
            xp: 10,
          },
        ],
      },
      {
        id: "lists-dicts",
        title: "Lists and Dictionaries",
        description: "Python's core collection types.",
        exercises: [
          {
            id: "lists",
            title: "Working with Lists",
            instructions:
              "Create a list `countries` with `\"Norway\", \"Sweden\", \"Denmark\", \"Finland\"`. Append `\"Iceland\"`, then print the list sorted alphabetically.",
            hint: "Use `.append()` to add and `sorted()` to sort.",
            starterCode:
              '# Create and modify a list\ncountries = [___]\ncountries.append(___)\nprint(sorted(countries))',
            sampleSolution:
              'countries = ["Norway", "Sweden", "Denmark", "Finland"]\ncountries.append("Iceland")\nprint(sorted(countries))',
            xp: 15,
          },
          {
            id: "dicts",
            title: "Dictionaries",
            instructions:
              "Create a dictionary `country_data` with keys `\"Norway\"`, `\"Sweden\"`, `\"Denmark\"` and values for their populations `5421241`, `10379295`, `5831404`. Print each country and its population using a `for` loop.",
            hint: "Use `.items()` to iterate over key-value pairs.",
            starterCode:
              "# Create a dictionary\ncountry_data = {\n    ___\n}\n\n# Iterate and print\nfor country, population in country_data.___():\n    print(f\"{country}: {population}\")",
            sampleSolution:
              'country_data = {\n    "Norway": 5421241,\n    "Sweden": 10379295,\n    "Denmark": 5831404\n}\nfor country, population in country_data.items():\n    print(f"{country}: {population}")',
            xp: 15,
          },
        ],
      },
      {
        id: "functions",
        title: "Functions",
        description: "Defining and using functions in Python.",
        exercises: [
          {
            id: "define-function",
            title: "Define a Function",
            instructions:
              "Define a function `compound_growth(principal, rate, years)` that returns the future value using the formula `principal * (1 + rate) ** years`. Test it with `principal=1000, rate=0.05, years=10`.",
            hint: "Use `**` for exponentiation in Python.",
            starterCode:
              "def compound_growth(principal, rate, years):\n    # Return future value\n    return ___\n\n# Test the function\nresult = compound_growth(1000, 0.05, 10)\nprint(round(result, 2))",
            sampleSolution:
              "def compound_growth(principal, rate, years):\n    return principal * (1 + rate) ** years\n\nresult = compound_growth(1000, 0.05, 10)\nprint(round(result, 2))",
            xp: 20,
          },
          {
            id: "list-comprehension",
            title: "List Comprehensions",
            instructions:
              "Use a list comprehension to create a list `squared` containing the squares of all even numbers from 1 to 20 (inclusive). Print the result.",
            hint: "Add `if x % 2 == 0` at the end of the comprehension to filter even numbers.",
            starterCode:
              "# Create list of squared even numbers from 1 to 20\nsquared = [___ for x in range(1, 21) if ___]\nprint(squared)",
            sampleSolution:
              "squared = [x**2 for x in range(1, 21) if x % 2 == 0]\nprint(squared)",
            xp: 20,
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────
  // Intermediate R
  // ─────────────────────────────────────────────────────
  {
    slug: "intermediate-r",
    title: "Intermediate R",
    description:
      "Level up your R skills with the tidyverse: dplyr, ggplot2, tidyr, and functional programming with purrr.",
    language: "r",
    level: "intermediate",
    category: "general",
    xpTotal: 400,
    icon: "🔷",
    tags: ["R", "tidyverse", "dplyr", "ggplot2", "intermediate"],
    chapters: [
      {
        id: "dplyr",
        title: "Data Wrangling with dplyr",
        description: "Filter, mutate, group, and summarise data.",
        exercises: [
          {
            id: "filter-mutate",
            title: "filter() and mutate()",
            instructions:
              "Load the `dplyr` package. Using the built-in `mtcars` dataset, filter cars with `mpg > 20` and add a new column `kpl` (kilometres per litre) by multiplying `mpg` by `0.425`.",
            hint: "Use the pipe operator `|>` to chain operations.",
            starterCode:
              "library(dplyr)\n\n# Filter and add a new column\nresult <- mtcars |>\n  filter(___) |>\n  mutate(kpl = ___)\nprint(head(result))",
            sampleSolution:
              "library(dplyr)\n\nresult <- mtcars |>\n  filter(mpg > 20) |>\n  mutate(kpl = mpg * 0.425)\nprint(head(result))",
            xp: 25,
          },
          {
            id: "group-summarise",
            title: "group_by() and summarise()",
            instructions:
              "Using `mtcars`, calculate the mean `mpg` and mean `hp` for each cylinder count (`cyl`), sorted by `cyl`.",
            hint: "Use `group_by(cyl) |> summarise(...)` then `arrange(cyl)`.",
            starterCode:
              "library(dplyr)\n\nmtcars |>\n  group_by(___) |>\n  summarise(\n    mean_mpg = mean(___),\n    mean_hp = mean(___)\n  ) |>\n  arrange(___)",
            sampleSolution:
              "library(dplyr)\n\nmtcars |>\n  group_by(cyl) |>\n  summarise(\n    mean_mpg = mean(mpg),\n    mean_hp = mean(hp)\n  ) |>\n  arrange(cyl)",
            xp: 25,
          },
        ],
      },
      {
        id: "ggplot2",
        title: "Visualisation with ggplot2",
        description: "Build publication-quality plots.",
        exercises: [
          {
            id: "scatter-plot",
            title: "Scatter Plot",
            instructions:
              "Using `ggplot2` and `mtcars`, create a scatter plot of `wt` (x-axis) vs `mpg` (y-axis), coloured by `factor(cyl)`. Add appropriate axis labels and a title.",
            hint: "Use `ggplot(mtcars, aes(x = wt, y = mpg, colour = factor(cyl)))` + `geom_point()`.",
            starterCode:
              'library(ggplot2)\n\nggplot(mtcars, aes(x = ___, y = ___, colour = factor(___))) +\n  geom_point() +\n  labs(\n    x = "Weight (1000 lbs)",\n    y = "Fuel Efficiency (MPG)",\n    colour = "Cylinders",\n    title = ___\n  )',
            sampleSolution:
              'library(ggplot2)\n\nggplot(mtcars, aes(x = wt, y = mpg, colour = factor(cyl))) +\n  geom_point() +\n  labs(\n    x = "Weight (1000 lbs)",\n    y = "Fuel Efficiency (MPG)",\n    colour = "Cylinders",\n    title = "Car Weight vs Fuel Efficiency"\n  )',
            xp: 25,
          },
          {
            id: "bar-chart",
            title: "Bar Chart",
            instructions:
              "Create a bar chart showing average `mpg` by `cyl` group. Use `stat = \"identity\"` and fill by cylinder count. Add a horizontal line at `mpg = 20` using `geom_hline()`.",
            hint: "First `group_by` and `summarise` with dplyr, then pipe to ggplot.",
            starterCode:
              'library(dplyr)\nlibrary(ggplot2)\n\nmtcars |>\n  group_by(cyl) |>\n  summarise(avg_mpg = mean(mpg)) |>\n  ggplot(aes(x = factor(cyl), y = avg_mpg, fill = factor(cyl))) +\n  geom_bar(stat = "identity") +\n  geom_hline(yintercept = ___, linetype = "dashed") +\n  labs(x = "Cylinders", y = "Average MPG", title = "Average MPG by Cylinder Count")',
            sampleSolution:
              'library(dplyr)\nlibrary(ggplot2)\n\nmtcars |>\n  group_by(cyl) |>\n  summarise(avg_mpg = mean(mpg)) |>\n  ggplot(aes(x = factor(cyl), y = avg_mpg, fill = factor(cyl))) +\n  geom_bar(stat = "identity") +\n  geom_hline(yintercept = 20, linetype = "dashed") +\n  labs(x = "Cylinders", y = "Average MPG", title = "Average MPG by Cylinder Count")',
            xp: 25,
          },
        ],
      },
      {
        id: "tidyr-purrr",
        title: "tidyr & purrr",
        description: "Reshape data and apply functional programming.",
        exercises: [
          {
            id: "pivot-wider",
            title: "Pivoting Data",
            instructions:
              "Using `tidyr`, convert a long-format data frame to wide format using `pivot_wider()`. The data has columns `country`, `year`, and `gdp`. Pivot so each year becomes a column.",
            hint: "Use `pivot_wider(names_from = year, values_from = gdp)`.",
            starterCode:
              'library(tidyr)\n\ngdp_long <- data.frame(\n  country = c("Norway", "Norway", "Sweden", "Sweden"),\n  year = c(2022, 2023, 2022, 2023),\n  gdp = c(579.3, 601.2, 585.9, 597.1)\n)\n\ngdp_wide <- gdp_long |>\n  pivot_wider(names_from = ___, values_from = ___)\nprint(gdp_wide)',
            sampleSolution:
              'library(tidyr)\n\ngdp_long <- data.frame(\n  country = c("Norway", "Norway", "Sweden", "Sweden"),\n  year = c(2022, 2023, 2022, 2023),\n  gdp = c(579.3, 601.2, 585.9, 597.1)\n)\n\ngdp_wide <- gdp_long |>\n  pivot_wider(names_from = year, values_from = gdp)\nprint(gdp_wide)',
            xp: 25,
          },
          {
            id: "map-functions",
            title: "Map Functions with purrr",
            instructions:
              "Use `purrr::map_dbl()` to compute the standard deviation of each numeric column in `mtcars`. Print the named numeric vector of results.",
            hint: "Use `map_dbl(mtcars, sd)` to apply `sd` to every column.",
            starterCode:
              "library(purrr)\n\n# Apply sd() to each column of mtcars\nresult <- map_dbl(___, ___)\nprint(round(result, 2))",
            sampleSolution:
              "library(purrr)\n\nresult <- map_dbl(mtcars, sd)\nprint(round(result, 2))",
            xp: 25,
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────
  // Intermediate Python
  // ─────────────────────────────────────────────────────
  {
    slug: "intermediate-python",
    title: "Intermediate Python",
    description:
      "Master pandas, NumPy, and matplotlib for data analysis and visualisation in Python.",
    language: "python",
    level: "intermediate",
    category: "general",
    xpTotal: 400,
    icon: "🟠",
    tags: ["Python", "pandas", "numpy", "matplotlib", "intermediate"],
    chapters: [
      {
        id: "numpy",
        title: "NumPy Essentials",
        description: "Fast numerical computing with arrays.",
        exercises: [
          {
            id: "arrays",
            title: "NumPy Arrays",
            instructions:
              "Import NumPy as `np`. Create a 2D array `matrix` with shape (3, 3) containing values 1–9. Print the array, its shape, and the mean of the second column.",
            hint: "Use `np.arange(1, 10).reshape(3, 3)` and `matrix[:, 1].mean()`.",
            starterCode:
              "import numpy as np\n\n# Create a 3x3 matrix\nmatrix = np.arange(1, 10).reshape(___)\nprint(matrix)\nprint(\"Shape:\", matrix.___)\nprint(\"Mean of col 2:\", matrix[:, ___].mean())",
            sampleSolution:
              "import numpy as np\n\nmatrix = np.arange(1, 10).reshape(3, 3)\nprint(matrix)\nprint(\"Shape:\", matrix.shape)\nprint(\"Mean of col 2:\", matrix[:, 1].mean())",
            xp: 25,
          },
          {
            id: "array-ops",
            title: "Array Operations",
            instructions:
              "Create two arrays `a = np.array([10, 20, 30, 40])` and `b = np.array([1, 2, 3, 4])`. Compute element-wise division, the dot product, and filter elements of `a` greater than 15.",
            hint: "Use `/` for division, `np.dot()` for dot product, and boolean indexing for filtering.",
            starterCode:
              "import numpy as np\n\na = np.array([10, 20, 30, 40])\nb = np.array([1, 2, 3, 4])\n\nprint(a / b)        # element-wise division\nprint(np.dot(___))  # dot product\nprint(a[___])       # elements > 15",
            sampleSolution:
              "import numpy as np\n\na = np.array([10, 20, 30, 40])\nb = np.array([1, 2, 3, 4])\n\nprint(a / b)\nprint(np.dot(a, b))\nprint(a[a > 15])",
            xp: 25,
          },
        ],
      },
      {
        id: "pandas",
        title: "Data Analysis with pandas",
        description: "Load, clean, transform, and aggregate data.",
        exercises: [
          {
            id: "dataframes",
            title: "Creating DataFrames",
            instructions:
              "Create a pandas DataFrame `df` from a dictionary with columns `country`, `gdp_billion`, and `population_million`. Add a derived column `gdp_per_capita` = `gdp_billion * 1000 / population_million`. Print the resulting DataFrame.",
            hint: "Use `pd.DataFrame({...})` and simple column arithmetic.",
            starterCode:
              "import pandas as pd\n\ndf = pd.DataFrame({\n    \"country\": [\"Germany\", \"France\", \"Italy\"],\n    \"gdp_billion\": [3869, 2779, 1997],\n    \"population_million\": [83.2, 67.4, 59.6]\n})\n\ndf[\"gdp_per_capita\"] = ___\nprint(df)",
            sampleSolution:
              "import pandas as pd\n\ndf = pd.DataFrame({\n    \"country\": [\"Germany\", \"France\", \"Italy\"],\n    \"gdp_billion\": [3869, 2779, 1997],\n    \"population_million\": [83.2, 67.4, 59.6]\n})\n\ndf[\"gdp_per_capita\"] = df[\"gdp_billion\"] * 1000 / df[\"population_million\"]\nprint(df)",
            xp: 25,
          },
          {
            id: "groupby",
            title: "GroupBy and Aggregation",
            instructions:
              "Create a DataFrame with columns `region`, `country`, and `exports_bn`. Use `groupby('region')` to compute the total and mean exports per region. Print the result.",
            hint: "Use `.agg({'exports_bn': ['sum', 'mean']})` after groupby.",
            starterCode:
              "import pandas as pd\n\ndf = pd.DataFrame({\n    \"region\": [\"EU\", \"EU\", \"Asia\", \"Asia\", \"Americas\"],\n    \"country\": [\"Germany\", \"France\", \"Japan\", \"China\", \"USA\"],\n    \"exports_bn\": [1563, 584, 756, 3380, 1754]\n})\n\nagg = df.groupby(___)[\"exports_bn\"].agg([\"sum\", \"mean\"])\nprint(agg)",
            sampleSolution:
              "import pandas as pd\n\ndf = pd.DataFrame({\n    \"region\": [\"EU\", \"EU\", \"Asia\", \"Asia\", \"Americas\"],\n    \"country\": [\"Germany\", \"France\", \"Japan\", \"China\", \"USA\"],\n    \"exports_bn\": [1563, 584, 756, 3380, 1754]\n})\n\nagg = df.groupby(\"region\")[\"exports_bn\"].agg([\"sum\", \"mean\"])\nprint(agg)",
            xp: 25,
          },
        ],
      },
      {
        id: "matplotlib",
        title: "Visualisation with matplotlib",
        description: "Create charts and plots in Python.",
        exercises: [
          {
            id: "line-plot",
            title: "Line Plot",
            instructions:
              "Plot GDP growth over years. Create `years = [2019, 2020, 2021, 2022, 2023]` and `gdp = [21.4, 20.9, 23.0, 25.5, 26.9]` (US GDP in trillions). Plot a line with markers, add axis labels and a title.",
            hint: "Use `plt.plot(years, gdp, marker='o')` then `plt.xlabel()`, `plt.ylabel()`, `plt.title()`.",
            starterCode:
              "import matplotlib\nmatplotlib.use('Agg')\nimport matplotlib.pyplot as plt\n\nyears = [2019, 2020, 2021, 2022, 2023]\ngdp = [21.4, 20.9, 23.0, 25.5, 26.9]\n\nplt.plot(___, ___, marker=___)\nplt.xlabel(\"Year\")\nplt.ylabel(\"GDP (Trillion USD)\")\nplt.title(\"US GDP 2019–2023\")\nplt.tight_layout()\nplt.savefig('/tmp/gdp_line.png')\nprint(\"Plot saved\")",
            sampleSolution:
              "import matplotlib\nmatplotlib.use('Agg')\nimport matplotlib.pyplot as plt\n\nyears = [2019, 2020, 2021, 2022, 2023]\ngdp = [21.4, 20.9, 23.0, 25.5, 26.9]\n\nplt.plot(years, gdp, marker='o')\nplt.xlabel(\"Year\")\nplt.ylabel(\"GDP (Trillion USD)\")\nplt.title(\"US GDP 2019–2023\")\nplt.tight_layout()\nplt.savefig('/tmp/gdp_line.png')\nprint(\"Plot saved\")",
            xp: 25,
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────
  // Economics & Data Science
  // ─────────────────────────────────────────────────────
  {
    slug: "economics-data-science",
    title: "Economics & Data Science",
    description:
      "Apply data science tools to economic questions: regression analysis, causal inference, time series, and policy evaluation.",
    language: "python",
    level: "intermediate",
    category: "economics",
    xpTotal: 500,
    icon: "📊",
    tags: ["economics", "regression", "OLS", "causal inference", "time series"],
    chapters: [
      {
        id: "regression",
        title: "Regression Analysis",
        description: "Ordinary Least Squares and model diagnostics.",
        exercises: [
          {
            id: "ols",
            title: "OLS Regression",
            instructions:
              "Using `statsmodels`, estimate a simple OLS regression of `wage` on `education` and `experience`. Use the sample data provided. Print the regression summary.",
            hint: "Use `sm.OLS(y, sm.add_constant(X)).fit()` and `.summary()`.",
            starterCode:
              "import numpy as np\nimport statsmodels.api as sm\n\nnp.random.seed(42)\nn = 100\neducation = np.random.randint(8, 22, n)\nexperience = np.random.randint(0, 30, n)\nwage = 5 + 2.5 * education + 0.8 * experience + np.random.normal(0, 3, n)\n\nX = np.column_stack([education, experience])\nX = sm.add_constant(X)\n\n# Fit OLS\nmodel = sm.OLS(___, ___).fit()\nprint(model.summary())",
            sampleSolution:
              "import numpy as np\nimport statsmodels.api as sm\n\nnp.random.seed(42)\nn = 100\neducation = np.random.randint(8, 22, n)\nexperience = np.random.randint(0, 30, n)\nwage = 5 + 2.5 * education + 0.8 * experience + np.random.normal(0, 3, n)\n\nX = np.column_stack([education, experience])\nX = sm.add_constant(X)\n\nmodel = sm.OLS(wage, X).fit()\nprint(model.summary())",
            xp: 40,
          },
          {
            id: "interpretation",
            title: "Interpreting Coefficients",
            instructions:
              "Fit the same wage regression. Extract the coefficient on `education`, its p-value, and the R-squared. Print formatted results like:\n`Education coef: 2.5, p-value: 0.000, R²: 0.85`",
            hint: "Access `.params`, `.pvalues`, and `.rsquared` attributes of the fitted model.",
            starterCode:
              "import numpy as np\nimport statsmodels.api as sm\n\nnp.random.seed(42)\nn = 100\neducation = np.random.randint(8, 22, n)\nexperience = np.random.randint(0, 30, n)\nwage = 5 + 2.5 * education + 0.8 * experience + np.random.normal(0, 3, n)\nX = sm.add_constant(np.column_stack([education, experience]))\nmodel = sm.OLS(wage, X).fit()\n\nedu_coef = model.params[___]\nedu_pval = model.pvalues[___]\nr_squared = model.___\n\nprint(f\"Education coef: {edu_coef:.2f}, p-value: {edu_pval:.3f}, R\\u00b2: {r_squared:.3f}\")",
            sampleSolution:
              "import numpy as np\nimport statsmodels.api as sm\n\nnp.random.seed(42)\nn = 100\neducation = np.random.randint(8, 22, n)\nexperience = np.random.randint(0, 30, n)\nwage = 5 + 2.5 * education + 0.8 * experience + np.random.normal(0, 3, n)\nX = sm.add_constant(np.column_stack([education, experience]))\nmodel = sm.OLS(wage, X).fit()\n\nedu_coef = model.params[1]\nedu_pval = model.pvalues[1]\nr_squared = model.rsquared\n\nprint(f\"Education coef: {edu_coef:.2f}, p-value: {edu_pval:.3f}, R\\u00b2: {r_squared:.3f}\")",
            xp: 30,
          },
        ],
      },
      {
        id: "causal-inference",
        title: "Causal Inference",
        description: "Difference-in-differences and regression discontinuity.",
        exercises: [
          {
            id: "diff-in-diff",
            title: "Difference-in-Differences",
            instructions:
              "Implement a Difference-in-Differences estimator. You have a panel with `treated` (0/1), `post` (0/1), and `outcome`. Add an interaction term `treated_post = treated * post` and run OLS. The DiD estimate is the coefficient on `treated_post`.",
            hint: "Create the interaction variable before running the regression.",
            starterCode:
              "import numpy as np\nimport pandas as pd\nimport statsmodels.api as sm\n\nnp.random.seed(0)\nn = 200\ntreated = np.repeat([0, 1], n // 2)\npost = np.tile([0, 1], n // 2)\ntrue_did = 5.0\noutcome = 10 + 3 * treated + 2 * post + true_did * (treated * post) + np.random.normal(0, 2, n)\n\ndf = pd.DataFrame({'treated': treated, 'post': post, 'outcome': outcome})\ndf['treated_post'] = ___\n\nX = sm.add_constant(df[['treated', 'post', 'treated_post']])\nmodel = sm.OLS(df['outcome'], X).fit()\nprint(f\"DiD estimate: {model.params['treated_post']:.2f}\")\nprint(f\"True effect:  {true_did:.2f}\")",
            sampleSolution:
              "import numpy as np\nimport pandas as pd\nimport statsmodels.api as sm\n\nnp.random.seed(0)\nn = 200\ntreated = np.repeat([0, 1], n // 2)\npost = np.tile([0, 1], n // 2)\ntrue_did = 5.0\noutcome = 10 + 3 * treated + 2 * post + true_did * (treated * post) + np.random.normal(0, 2, n)\n\ndf = pd.DataFrame({'treated': treated, 'post': post, 'outcome': outcome})\ndf['treated_post'] = df['treated'] * df['post']\n\nX = sm.add_constant(df[['treated', 'post', 'treated_post']])\nmodel = sm.OLS(df['outcome'], X).fit()\nprint(f\"DiD estimate: {model.params['treated_post']:.2f}\")\nprint(f\"True effect:  {true_did:.2f}\")",
            xp: 50,
          },
        ],
      },
      {
        id: "time-series",
        title: "Time Series Analysis",
        description: "Trends, seasonality, and forecasting.",
        exercises: [
          {
            id: "rolling-stats",
            title: "Rolling Statistics",
            instructions:
              "Create a monthly GDP time series with trend and noise. Compute 3-month and 12-month rolling means using pandas. Print the last 5 rows showing both rolling means alongside the original values.",
            hint: "Use `.rolling(window=3).mean()` and `.rolling(window=12).mean()` on a Series.",
            starterCode:
              "import numpy as np\nimport pandas as pd\n\nnp.random.seed(7)\ndates = pd.date_range('2015-01', periods=60, freq='MS')\ngdp = 100 + np.arange(60) * 0.5 + np.random.normal(0, 2, 60)\n\ndf = pd.DataFrame({'date': dates, 'gdp': gdp}).set_index('date')\ndf['ma3']  = df['gdp'].rolling(window=___).mean()\ndf['ma12'] = df['gdp'].rolling(window=___).mean()\nprint(df.tail(5))",
            sampleSolution:
              "import numpy as np\nimport pandas as pd\n\nnp.random.seed(7)\ndates = pd.date_range('2015-01', periods=60, freq='MS')\ngdp = 100 + np.arange(60) * 0.5 + np.random.normal(0, 2, 60)\n\ndf = pd.DataFrame({'date': dates, 'gdp': gdp}).set_index('date')\ndf['ma3']  = df['gdp'].rolling(window=3).mean()\ndf['ma12'] = df['gdp'].rolling(window=12).mean()\nprint(df.tail(5))",
            xp: 40,
          },
          {
            id: "arima",
            title: "ARIMA Forecasting",
            instructions:
              "Fit an ARIMA(1,1,1) model to a simulated GDP series using `statsmodels`. Print the model summary and generate a 4-step-ahead forecast.",
            hint: "Use `ARIMA(series, order=(1, 1, 1)).fit()` and `.forecast(steps=4)`.",
            starterCode:
              "import numpy as np\nimport pandas as pd\nfrom statsmodels.tsa.arima.model import ARIMA\n\nnp.random.seed(42)\ngdp = 100 + np.cumsum(np.random.normal(0.5, 1.5, 80))\n\nmodel = ARIMA(gdp, order=(1, 1, 1)).fit()\nprint(model.summary())\n\nforecast = model.forecast(steps=___)\nprint(\"\\n4-step forecast:\", forecast.round(2))",
            sampleSolution:
              "import numpy as np\nimport pandas as pd\nfrom statsmodels.tsa.arima.model import ARIMA\n\nnp.random.seed(42)\ngdp = 100 + np.cumsum(np.random.normal(0.5, 1.5, 80))\n\nmodel = ARIMA(gdp, order=(1, 1, 1)).fit()\nprint(model.summary())\n\nforecast = model.forecast(steps=4)\nprint(\"\\n4-step forecast:\", forecast.round(2))",
            xp: 50,
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────
  // R for Economists
  // ─────────────────────────────────────────────────────
  {
    slug: "r-for-economists",
    title: "R for Economists",
    description:
      "Use R for economic research: panel data, instrumental variables, regression tables, and reproducible workflows.",
    language: "r",
    level: "intermediate",
    category: "economics",
    xpTotal: 450,
    icon: "📈",
    tags: ["R", "economics", "panel data", "IV", "fixest"],
    chapters: [
      {
        id: "panel-data",
        title: "Panel Data with fixest",
        description: "Fixed effects and clustered standard errors.",
        exercises: [
          {
            id: "fe-regression",
            title: "Fixed Effects Regression",
            instructions:
              "Using the `fixest` package, estimate a two-way fixed effects model of `log(wage)` on `education` with individual and year fixed effects. Use `feols()` and cluster standard errors by `id`.",
            hint: "Use `feols(log(wage) ~ education | id + year, cluster = ~id, data = panel)` syntax.",
            starterCode:
              "library(fixest)\n\n# Simulated panel data\nset.seed(1)\npanel <- data.frame(\n  id = rep(1:50, each = 5),\n  year = rep(2019:2023, 50),\n  education = rep(sample(8:20, 50, replace = TRUE), each = 5),\n  wage = exp(0.5 + rep(rnorm(50), each = 5) + rnorm(250, 0, 0.3))\n)\npanel$wage <- panel$wage + 2 * panel$education\n\n# Two-way FE with clustered SEs\nmodel <- feols(___ | id + year, cluster = ~id, data = panel)\nprint(summary(model))",
            sampleSolution:
              "library(fixest)\n\nset.seed(1)\npanel <- data.frame(\n  id = rep(1:50, each = 5),\n  year = rep(2019:2023, 50),\n  education = rep(sample(8:20, 50, replace = TRUE), each = 5),\n  wage = exp(0.5 + rep(rnorm(50), each = 5) + rnorm(250, 0, 0.3))\n)\npanel$wage <- panel$wage + 2 * panel$education\n\nmodel <- feols(log(wage) ~ education | id + year, cluster = ~id, data = panel)\nprint(summary(model))",
            xp: 50,
          },
        ],
      },
      {
        id: "iv-regression",
        title: "Instrumental Variables",
        description: "2SLS and IV estimation.",
        exercises: [
          {
            id: "2sls",
            title: "Two-Stage Least Squares",
            instructions:
              "Estimate a 2SLS model using `fixest::feols()`. The endogenous variable is `education`, the instrument is `proximity_to_college`, and the outcome is `wage`. Use the IV syntax `wage ~ 1 | education ~ proximity_to_college`.",
            hint: "In fixest, IV is specified as `y ~ exog | endog ~ instrument`.",
            starterCode:
              "library(fixest)\n\nset.seed(99)\nn <- 200\nproximity <- rnorm(n)\nability <- rnorm(n)\neducation <- 12 + proximity * 2 + ability + rnorm(n)\nwage <- 5 + education * 1.5 + ability * 3 + rnorm(n)\n\ndf <- data.frame(wage, education, proximity_to_college = proximity)\n\n# IV regression\niv_model <- feols(wage ~ 1 | education ~ proximity_to_college, data = df)\nprint(summary(iv_model))",
            sampleSolution:
              "library(fixest)\n\nset.seed(99)\nn <- 200\nproximity <- rnorm(n)\nability <- rnorm(n)\neducation <- 12 + proximity * 2 + ability + rnorm(n)\nwage <- 5 + education * 1.5 + ability * 3 + rnorm(n)\n\ndf <- data.frame(wage, education, proximity_to_college = proximity)\n\niv_model <- feols(wage ~ 1 | education ~ proximity_to_college, data = df)\nprint(summary(iv_model))",
            xp: 50,
          },
        ],
      },
      {
        id: "reproducible-research",
        title: "Reproducible Research",
        description: "Best practices for reproducible economic analysis.",
        exercises: [
          {
            id: "regression-table",
            title: "Regression Tables",
            instructions:
              "Fit three OLS models of increasing complexity and produce a formatted regression table using `modelsummary`. Model 1: wage ~ education; Model 2: wage ~ education + experience; Model 3: wage ~ education + experience + age.",
            hint: "Use `modelsummary(list(m1, m2, m3))` with `stars = TRUE`.",
            starterCode:
              "library(modelsummary)\n\nset.seed(5)\nn <- 150\ndf <- data.frame(\n  education = sample(8:20, n, replace = TRUE),\n  experience = sample(0:30, n, replace = TRUE),\n  age = sample(22:65, n, replace = TRUE)\n)\ndf$wage <- 3 + 2 * df$education + 0.5 * df$experience + 0.1 * df$age + rnorm(n, 0, 4)\n\nm1 <- lm(wage ~ education, data = df)\nm2 <- lm(wage ~ education + experience, data = df)\nm3 <- lm(wage ~ education + experience + age, data = df)\n\nmodelsummary(list(m1, m2, m3), stars = ___)",
            sampleSolution:
              "library(modelsummary)\n\nset.seed(5)\nn <- 150\ndf <- data.frame(\n  education = sample(8:20, n, replace = TRUE),\n  experience = sample(0:30, n, replace = TRUE),\n  age = sample(22:65, n, replace = TRUE)\n)\ndf$wage <- 3 + 2 * df$education + 0.5 * df$experience + 0.1 * df$age + rnorm(n, 0, 4)\n\nm1 <- lm(wage ~ education, data = df)\nm2 <- lm(wage ~ education + experience, data = df)\nm3 <- lm(wage ~ education + experience + age, data = df)\n\nmodelsummary(list(m1, m2, m3), stars = TRUE)",
            xp: 40,
          },
        ],
      },
    ],
  },
];

export function getCourse(slug: string): Course | undefined {
  return courses.find((c) => c.slug === slug);
}

export function getExercise(
  slug: string,
  chapterId: string,
  exerciseId: string
): { course: Course; chapter: Course["chapters"][0]; exercise: Exercise } | undefined {
  const course = getCourse(slug);
  if (!course) return undefined;
  const chapter = course.chapters.find((ch) => ch.id === chapterId);
  if (!chapter) return undefined;
  const exercise = chapter.exercises.find((ex) => ex.id === exerciseId);
  if (!exercise) return undefined;
  return { course, chapter, exercise };
}

