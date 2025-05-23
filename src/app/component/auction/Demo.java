import java.util.*;
import java.util.stream.*;
//import java.util.Collectors;

class Main {
    public static void main(String[] args) {
        ArrayList<String> list = new ArrayList();
        list.add("banana");
        list.add("ball");
        list.add("apple");
      //  banana, ball, caram, apple orrange, cat
        
        
      List<String> b = list.stream().filter(x-> x.charAt(1)=='a').collect(Collectors.toList());
         //List<String> b = list.stream()
           //                .filter(x -> x.length() > 1 && x.charAt(1) == 'a')
             //                .collect(Collectors.toList());
      System.out.println(b);
      
      
    }
}