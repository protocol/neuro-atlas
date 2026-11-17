import pandas
from matplotlib import pyplot
from matplotlib.ticker import ScalarFormatter, LogLocator
from scipy import linspace, polyval, polyfit, stats
from numpy import double, log, asarray, exp, std, sqrt, mean
from pylab import random_integers, zeros
import seaborn as sns

def log_10_product(x, pos):
    """The two args are the value and tick position.
    Label ticks with the product of the exponentiation"""
    return '%1i' % (x)

# Load data from google spreadsheet
data = pandas.io.parsers.read_csv("https://docs.google.com/spreadsheet/pub?hl=en_US&hl=en_US&key=0Ai7vcDJIlD6AdF9vQWlNRDh2S1dub09jMWRvTFRpemc&single=true&gid=0&output=csv")
data = asarray(data);
data[data[:,1]==0,1]=6.5 # fix missing month values by assuming middle of year
t = double(data[:,0])+double(data[:,1]-0.5)/12; # assume middle of month
n = double(data[:,2]);

# Only keep first M papers to record >=N neurons
M=10
idx = []
for i in range(0,len(t)):
	if sum(t[i]>t[n>=n[i]])<M:
		idx.append(i)
idx = asarray(idx)

# Exponential fit with bootstrap standard error (could use statsmodels here)
(ar,br)=polyfit(t[idx],log(n[idx]),1)
arb=zeros(1000)
brb=zeros(1000)
for i in range(0,1000):
	sidx = idx[random_integers(0, len(idx)-1, len(idx))]
	(arb[i],brb[i])=polyfit(t[sidx],log(n[sidx]),1)
t0 = linspace(min(t)-1,max(t)+1,100);
nhat = polyval([ar,br],t0);
x = t[idx];
y = log(n[idx])
yhat = br+x*ar;
ci = stats.t.isf(0.05/2,len(x)-2)*sqrt(sum(pow(y-yhat,2))/(len(y)-2))*sqrt(1/len(y)+pow(t0-mean(x),2)/sum(pow(x-mean(x),2)))


# restore defaults
pyplot.rcParams['figure.figsize'] = [8.0, 6.0]
pyplot.rcParams['figure.dpi'] = 80
pyplot.rcParams['savefig.dpi'] = 100
pyplot.rcParams['font.size'] = 12
pyplot.rcParams['legend.fontsize'] = 'large'
pyplot.rcParams['figure.titlesize'] = 'medium'


sns.set_style("ticks")
sns.set_palette(sns.color_palette("deep"))
f = pyplot.figure();
pyplot.grid(b=True, which='major', color='0.9', linestyle='-')
pyplot.tick_params(axis='both', direction='out')
pyplot.locator_params(axis='x',nbins=20)
pyplot.semilogy(t[idx],n[idx],'o',ms=10,mew=0.25,mec='1.0')
pyplot.xlabel('Publication Date',fontsize=16)
pyplot.ylabel('Simultaneously Recorded Neurons',fontsize=16)
pyplot.title("Doubling Time: %0.01f $\pm$ %0.01f years (n=%i)" % (log(2)/ar,std(log(2)/arb),len(idx)),fontsize=16)

# Add exponential fit to plot
pyplot.semilogy(t0,exp(nhat),lw=2)
pyplot.fill_between(t0,exp(nhat+ci),exp(nhat-ci),alpha=0.25,color=sns.color_palette()[1])
pyplot.ylim([1, max(n)*1.2])
pyplot.xlim([min(t)-1, max(t)+1])


sns.despine()
pyplot.gca().yaxis.set_major_locator(LogLocator(subs=[0.5,1.0]))
pyplot.gca().yaxis.set_major_formatter(ScalarFormatter())

pyplot.savefig('scaling.png',dpi=300)
pyplot.savefig('scaling.pdf')
pyplot.show()