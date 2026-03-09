def compound_growth(principal, rate, years):
    return principal * (1 + rate) ** years

result = compound_growth(1000, 0.05, 10)
print(round(result, 2))
