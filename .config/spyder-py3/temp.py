from random import randint

resultsWithAdvantage = []
results = []
resultsWithDisadvantage = {}

for i in range(1, 1000000):
    number1 = (randint(1, 6) + randint(1, 6) + randint(1, 6))
    number2 = (randint(1, 6) + randint(1, 6) + randint(1, 6))
    resultsWith