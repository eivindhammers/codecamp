import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

years = [2019, 2020, 2021, 2022, 2023]
gdp = [21.4, 20.9, 23.0, 25.5, 26.9]

plt.plot(years, gdp, marker='o')
plt.xlabel("Year")
plt.ylabel("GDP (Trillion USD)")
plt.title("US GDP 2019–2023")
plt.tight_layout()
plt.savefig('/tmp/gdp_line.png')
print("Plot saved")
