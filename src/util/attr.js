var attr_extend;

(function(){
    attr_extend = function (a, b) {
        if (a == null) {
            return b == null
                ? {}
                : obj_create(b);
        }
        
        if (b == null) 
            return a;
        
        var key;
        for(key in b) {
            if ('class' === key && typeof a[key] === 'string') {
                a[key] += ' ' + b[key];
                continue;
            }
            a[key] = b[key];
        }
        return a;
    };
}());
