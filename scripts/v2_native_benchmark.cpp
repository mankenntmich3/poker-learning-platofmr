// Original diagnostic chance-sampled CFR kernel. No publication authority.
#include <algorithm>
#include <chrono>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <vector>
struct Node { int32_t actor,street,count,offset,child[5]; double payoff[3]; };
template<class T> void read(std::ifstream& f,T& x){f.read(reinterpret_cast<char*>(&x),sizeof(x));if(!f)throw std::runtime_error("Truncated input");}
int main(int argc,char** argv){
 if(argc!=4)throw std::runtime_error("input output iterations required");
 std::ifstream f(argv[1],std::ios::binary);uint32_t magic,n,worlds,size;read(f,magic);read(f,n);read(f,worlds);read(f,size);
 if(magic!=0x32564652||n>1000||worlds>2000000||size>4000000)throw std::runtime_error("Invalid bounded input");
 std::vector<Node> nodes(n);for(auto& x:nodes){read(f,x.actor);read(f,x.street);read(f,x.count);read(f,x.offset);for(auto& c:x.child)read(f,c);for(auto& p:x.payoff)read(f,p);}
 std::vector<int16_t> data(worlds*5);f.read(reinterpret_cast<char*>(data.data()),data.size()*2);if(!f)throw std::runtime_error("Incomplete chance");
 int iterations=std::stoi(argv[3]);if(iterations<1||iterations>10000)throw std::runtime_error("Iteration bound");
 std::vector<double> regret(size),sum(size),policy(size),delta(size),average(size),value(n),reach(2*n);
 std::vector<int> index(n);uint32_t rng=17;uint64_t visits=0;
 auto random=[&](){rng^=rng<<13;rng^=rng>>17;rng^=rng<<5;return rng;};
 auto sample=[&](){uint64_t limit=(uint64_t(0xffffffff)/worlds)*worlds;uint32_t x;do{x=random()-1;}while(x>=limit);return x%worlds;};
 auto start=std::chrono::steady_clock::now();
 for(int iteration=0;iteration<iterations;iteration++){
  std::fill(delta.begin(),delta.end(),0);
  for(auto& x:nodes)if(x.actor>=0)for(int h=0;h<(x.street?9126:169);h++){
   int at=x.offset+h*x.count;double total=0;for(int a=0;a<x.count;a++)total+=std::max(0.,regret[at+a]);
   for(int a=0;a<x.count;a++)policy[at+a]=total>0?std::max(0.,regret[at+a])/total:1./x.count;
  }
  for(int draw=0;draw<256;draw++){
   auto w=sample();std::fill(reach.begin(),reach.end(),0);reach[0]=reach[n]=1;
   for(unsigned i=0;i<n;i++){
    auto& x=nodes[i];if(x.actor<0){value[i]=x.payoff[data[w*5+4]];continue;}
    if(reach[i]==0&&reach[n+i]==0)continue;
    int at=x.offset+data[w*5+x.actor+2*x.street]*x.count;index[i]=at;
    for(int a=0;a<x.count;a++){reach[x.actor*n+x.child[a]]=reach[x.actor*n+i]*policy[at+a];reach[(1-x.actor)*n+x.child[a]]=reach[(1-x.actor)*n+i];}
   }
   for(int i=int(n)-1;i>=0;i--){auto& x=nodes[i];if(x.actor<0)continue;int at=index[i];double v=0;
    for(int a=0;a<x.count;a++)v+=policy[at+a]*value[x.child[a]];value[i]=v;
    if(reach[i]==0&&reach[n+i]==0)continue;visits++;
    for(int a=0;a<x.count;a++){delta[at+a]+=reach[(1-x.actor)*n+i]*(value[x.child[a]]-v)*(x.actor?-1:1)/256.;sum[at+a]+=reach[x.actor*n+i]*policy[at+a]/256.;}
   }
  }
  for(unsigned k=0;k<size;k++)regret[k]+=delta[k];
 }
 for(auto& x:nodes)if(x.actor>=0)for(int h=0;h<(x.street?9126:169);h++){
  int at=x.offset+h*x.count;double total=0;for(int a=0;a<x.count;a++)total+=sum[at+a];
  for(int a=0;a<x.count;a++)average[at+a]=total>0?sum[at+a]/total:1./x.count;
 }
 double seconds=std::chrono::duration<double>(std::chrono::steady_clock::now()-start).count();
 std::ofstream out(argv[2],std::ios::binary);out.write(reinterpret_cast<char*>(average.data()),average.size()*8);if(!out)throw std::runtime_error("Cannot save profile");
 std::cout<<"{\"language\":\"C++20\",\"seconds\":"<<seconds<<",\"visitedDecisionNodes\":"<<visits<<",\"nodesPerSecond\":"<<visits/seconds<<",\"numericBufferBytes\":"<<(size*5+n*3)*8<<",\"publicationEligible\":false}"<<std::endl;
}
