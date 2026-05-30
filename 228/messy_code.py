def messy_function(a,b,c):
    
    result = a + b 
    if result > 10:
        return result * 2
    else:
        return result / 2
        
def another_messy_func(x,y):
    total = 0
    for i in range(x):
        for j in range(y):
            total += i * j
    return total
        
class MessyClass:
    def __init__(self,value):
        self.value = value
    def get_value(self):
        return self.value
    def set_value(self,new_value):
        self.value = new_value
        
